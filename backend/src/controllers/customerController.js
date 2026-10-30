const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');

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
  try {
    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.customerId,
        parkingId: req.params.parkingId,
      },
      { $set: { status: 'inactive' } },
      { returnDocument: 'after', runValidators: true },
    );

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    return res.json({ customer });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    return res.status(500).json({ message: 'Could not deactivate customer' });
  }
};

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deactivateCustomer,
};
