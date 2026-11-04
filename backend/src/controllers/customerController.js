const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const ParkingSubscription = require('../models/ParkingSubscription');
const MonthlyDue = require('../models/MonthlyDue');
const { generateMissingDues } = require('../services/dueGeneration');
const { getFinalBillingPeriod } = require('../utils/billingPeriods');
const { isTransactionUnsupported } = require('../utils/mongoErrors');

const CUSTOMER_FIELDS = [
  'fullName',
  'primaryPhone',
  'secondaryPhone',
  'address',
  'notes',
  'registrationDate',
];

const getCustomerFields = (body) => Object.fromEntries(
  CUSTOMER_FIELDS
    .filter((field) => Object.hasOwn(body, field))
    .map((field) => [field, body[field]]),
);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const createCustomer = async (req, res) => {
  const { fullName, primaryPhone } = req.body;

  if (typeof fullName !== 'string' || !fullName.trim()) {
    return res.status(400).json({ message: 'Customer name is required' });
  }

  if (typeof primaryPhone !== 'string' || !primaryPhone.trim()) {
    return res.status(400).json({ message: 'Primary phone is required' });
  }

  try {
    const customer = await Customer.create({
      ...getCustomerFields(req.body),
      fullName: fullName.trim(),
      primaryPhone: primaryPhone.trim(),
      parkingId: req.params.parkingId,
      createdBy: req.user.id,
    });

    return res.status(201).json({ customer });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Could not create customer' });
  }
};

const listCustomers = async (req, res) => {
  const { search = '', status = 'active' } = req.query;
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);

  if (!['active', 'inactive', 'all'].includes(status)) {
    return res.status(400).json({ message: 'Status must be active, inactive, or all' });
  }

  try {
    const query = { parkingId: req.params.parkingId };
    if (status !== 'all') {
      query.status = status;
    }
    if (search.trim()) {
      const matcher = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { fullName: matcher },
        { primaryPhone: matcher },
        { secondaryPhone: matcher },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort({ fullName: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query),
    ]);

    const customerIds = customers.map((customer) => customer._id);
    const vehicleCounts = await Vehicle.aggregate([
      {
        $match: {
          parkingId: new mongoose.Types.ObjectId(req.params.parkingId),
          customerId: { $in: customerIds },
          status: 'active',
        },
      },
      { $group: { _id: '$customerId', count: { $sum: 1 } } },
    ]);
    const countsByCustomer = new Map(
      vehicleCounts.map(({ _id, count }) => [_id.toString(), count]),
    );

    return res.json({
      customers: customers.map((customer) => ({
        ...customer,
        vehicleCount: countsByCustomer.get(customer._id.toString()) || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not load customers' });
  }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
    }).lean();

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const vehicles = await Vehicle.find({
      parkingId: req.params.parkingId,
      customerId: customer._id,
    }).sort({ createdAt: -1 }).lean();

    return res.json({ customer: { ...customer, vehicles } });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    return res.status(500).json({ message: 'Could not load customer profile' });
  }
};

const updateCustomer = async (req, res) => {
  const updates = getCustomerFields(req.body);

  if (Object.hasOwn(updates, 'fullName') &&
      (typeof updates.fullName !== 'string' || !updates.fullName.trim())) {
    return res.status(400).json({ message: 'Customer name is required' });
  }

  if (Object.hasOwn(updates, 'primaryPhone') &&
      (typeof updates.primaryPhone !== 'string' || !updates.primaryPhone.trim())) {
    return res.status(400).json({ message: 'Primary phone is required' });
  }

  try {
    if (typeof updates.fullName === 'string') {
      updates.fullName = updates.fullName.trim();
    }
    if (typeof updates.primaryPhone === 'string') {
      updates.primaryPhone = updates.primaryPhone.trim();
    }

    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.customerId,
        parkingId: req.params.parkingId,
      },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ customer });
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Could not update customer' });
  }
};

const deactivateCustomer = async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    let customer;
    await session.withTransaction(async () => {
      customer = await Customer.findOne({
        _id: req.params.customerId,
        parkingId: req.params.parkingId,
      }).session(session);

      if (!customer) {
        const error = new Error('Customer not found');
        error.status = 404;
        throw error;
      }

      const activeSubscriptions = await ParkingSubscription.find({
        parkingId: req.params.parkingId,
        customerId: customer._id,
        status: 'active',
      }).session(session);
      for (const subscription of activeSubscriptions) {
        await generateMissingDues(subscription._id, { session });
        const endedAt = new Date();
        const finalPeriod = getFinalBillingPeriod(subscription.startDate, endedAt);
        subscription.status = 'ended';
        subscription.endedAt = endedAt;
        if (subscription.pendingRateChange?.effectiveFrom
          && new Date(subscription.pendingRateChange.effectiveFrom) > finalPeriod.start) {
          subscription.pendingRateChange = undefined;
        }
        await subscription.save({ session });
      }

      const vehicles = await Vehicle.find({
        parkingId: req.params.parkingId,
        customerId: customer._id,
      }).session(session);
      for (const vehicle of vehicles) {
        const activeVehicleSubscription = await ParkingSubscription.findOne({
          parkingId: req.params.parkingId,
          customerId: customer._id,
          vehicleId: vehicle._id,
          status: 'active',
        }).session(session);
        if (activeVehicleSubscription) {
          await generateMissingDues(activeVehicleSubscription._id, { session });
          const endedAt = new Date();
          const finalPeriod = getFinalBillingPeriod(activeVehicleSubscription.startDate, endedAt);
          activeVehicleSubscription.status = 'ended';
          activeVehicleSubscription.endedAt = endedAt;
          if (activeVehicleSubscription.pendingRateChange?.effectiveFrom
            && new Date(activeVehicleSubscription.pendingRateChange.effectiveFrom) > finalPeriod.start) {
            activeVehicleSubscription.pendingRateChange = undefined;
          }
          await activeVehicleSubscription.save({ session });
        }
        vehicle.status = 'inactive';
        await vehicle.save({ session });
      }

      customer.status = 'inactive';
      await customer.save({ session });
    });

    return res.json({ customer });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ message: error.message });
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }
    if (isTransactionUnsupported(error)) {
      return res.status(503).json({ message: 'MongoDB transactions require a replica set to deactivate customers and subscriptions safely' });
    }

    return res.status(500).json({ message: 'Could not deactivate customer' });
  } finally {
    if (session) await session.endSession();
  }
};

const activateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.status === 'active') {
      return res.json({ customer });
    }

    customer.status = 'active';
    await customer.save();
    return res.json({ customer });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }
    return res.status(500).json({ message: 'Could not activate customer' });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
    }).select('_id status').lean();

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.status !== 'inactive') {
      return res.status(409).json({ message: 'Only inactive customers can be removed' });
    }

    await Promise.all([
      Customer.deleteOne({ _id: req.params.customerId, parkingId: req.params.parkingId, status: 'inactive' }),
      Vehicle.deleteMany({ parkingId: req.params.parkingId, customerId: req.params.customerId }),
      ParkingSubscription.deleteMany({ parkingId: req.params.parkingId, customerId: req.params.customerId }),
      MonthlyDue.deleteMany({ parkingId: req.params.parkingId, customerId: req.params.customerId }),
    ]);

    return res.json({ deleted: true });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }
    return res.status(500).json({ message: 'Could not remove customer' });
  }
};

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deactivateCustomer,
  activateCustomer,
  deleteCustomer,
};
