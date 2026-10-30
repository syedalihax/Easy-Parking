const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const ParkingSubscription = require('../models/ParkingSubscription');
const { getBillingPeriod, getFinalBillingPeriod } = require('../utils/billingPeriods');
const { generateMissingDues } = require('../services/dueGeneration');
const { isTransactionUnsupported } = require('../utils/mongoErrors');

const VEHICLE_FIELDS = [
  'registrationNumber',
  'vehicleType',
  'makeModel',
  'color',
  'parkingStartDate',
  'notes',
];

const getVehicleFields = (body) => Object.fromEntries(
  VEHICLE_FIELDS
    .filter((field) => Object.hasOwn(body, field))
    .map((field) => [field, body[field]]),
);

const normalizeVehicleFields = (fields) => {
  if (typeof fields.registrationNumber === 'string') {
    fields.registrationNumber = fields.registrationNumber.trim().toUpperCase();
  }
  if (typeof fields.parkingStartDate === 'string' && fields.parkingStartDate.trim()) {
    fields.parkingStartDate = new Date(fields.parkingStartDate);
  }
  return fields;
};

const validateVehicleFields = (fields, requireAll = false) => {
  if (requireAll || Object.hasOwn(fields, 'registrationNumber')) {
    if (typeof fields.registrationNumber !== 'string' || !fields.registrationNumber.trim()) {
      return 'Registration number is required';
    }
  }
  if (requireAll || Object.hasOwn(fields, 'parkingStartDate')) {
    const date = new Date(fields.parkingStartDate);
    if (!fields.parkingStartDate || Number.isNaN(date.getTime())) {
      return 'Parking start date is required and must be valid';
    }
  }
  return null;
};

const isDuplicateRegistration = (error) => error.code === 11000;

const createVehicle = async (req, res) => {
  const fields = normalizeVehicleFields(getVehicleFields(req.body));
  const validationMessage = validateVehicleFields(fields, true);
  const monthlyRate = Number(req.body.monthlyRate);

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }
  if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
    return res.status(400).json({ message: 'A non-negative monthlyRate is required to add a vehicle' });
  }

  let session;
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
      status: 'active',
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    session = await mongoose.startSession();
    let vehicle;
    await session.withTransaction(async () => {
      [vehicle] = await Vehicle.create([{
        ...fields,
        parkingId: req.params.parkingId,
        customerId: customer._id,
      }], { session });
      await ParkingSubscription.create([{
        parkingId: req.params.parkingId,
        customerId: customer._id,
        vehicleId: vehicle._id,
        monthlyRate,
        startDate: vehicle.parkingStartDate,
        billingCycleDay: vehicle.parkingStartDate.getUTCDate(),
        createdBy: req.user.id,
      }], { session });
    });

    return res.status(201).json({ vehicle });
  } catch (error) {
    if (isDuplicateRegistration(error)) {
      return res.status(409).json({ message: 'An active vehicle already uses this registration number' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    if (isTransactionUnsupported(error)) {
      return res.status(503).json({ message: 'MongoDB transactions require a replica set to add vehicles and subscriptions safely' });
    }

    return res.status(500).json({ message: 'Could not create vehicle' });
  } finally {
    if (session) await session.endSession();
  }
};

const listCustomerVehicles = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
    }).select('_id').lean();

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const vehicles = await Vehicle.find({
      parkingId: req.params.parkingId,
      customerId: customer._id,
    }).sort({ createdAt: -1 }).lean();

    return res.json({ vehicles });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid customer ID' });
    }

    return res.status(500).json({ message: 'Could not load vehicles' });
  }
};

const updateVehicle = async (req, res) => {
  const updates = normalizeVehicleFields(getVehicleFields(req.body));
  const validationMessage = validateVehicleFields(updates);

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  try {
    if (Object.hasOwn(updates, 'parkingStartDate')) {
      const activeSubscription = await ParkingSubscription.findOne({
        parkingId: req.params.parkingId,
        customerId: req.params.customerId,
        vehicleId: req.params.vehicleId,
        status: 'active',
      }).select('startDate');
      if (activeSubscription
        && new Date(updates.parkingStartDate).getTime() !== new Date(activeSubscription.startDate).getTime()) {
        return res.status(409).json({ message: 'A vehicle start date anchors its subscription and cannot be changed while active' });
      }
    }

    const vehicle = await Vehicle.findOneAndUpdate(
      {
        _id: req.params.vehicleId,
        parkingId: req.params.parkingId,
        customerId: req.params.customerId,
      },
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    return res.json({ vehicle });
  } catch (error) {
    if (isDuplicateRegistration(error)) {
      return res.status(409).json({ message: 'An active vehicle already uses this registration number' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Could not update vehicle' });
  }
};

const deactivateVehicle = async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    let vehicle;
    await session.withTransaction(async () => {
      vehicle = await Vehicle.findOne({
        _id: req.params.vehicleId,
        parkingId: req.params.parkingId,
        customerId: req.params.customerId,
      }).session(session);
      if (!vehicle) {
        const error = new Error('Vehicle not found');
        error.status = 404;
        throw error;
      }

      const subscription = await ParkingSubscription.findOne({
        parkingId: req.params.parkingId,
        customerId: req.params.customerId,
        vehicleId: vehicle._id,
        status: 'active',
      }).session(session);
      if (subscription) {
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
      vehicle.status = 'inactive';
      await vehicle.save({ session });
    });

    return res.json({ vehicle });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ message: error.message });
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    }
    if (isTransactionUnsupported(error)) {
      return res.status(503).json({ message: 'MongoDB transactions require a replica set to deactivate vehicles and subscriptions safely' });
    }

    return res.status(500).json({ message: 'Could not deactivate vehicle' });
  } finally {
    if (session) await session.endSession();
  }
};

const replaceVehicle = async (req, res) => {
  const fields = normalizeVehicleFields(getVehicleFields(req.body));
  const validationMessage = validateVehicleFields(fields, true);

  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  let session;

  try {
    session = await mongoose.startSession();
    let replacement;

    await session.withTransaction(async () => {
      const oldVehicle = await Vehicle.findOne({
        _id: req.params.oldVehicleId,
        parkingId: req.params.parkingId,
        customerId: req.params.customerId,
        status: 'active',
      }).session(session);

      if (!oldVehicle) {
        const error = new Error('Active vehicle not found');
        error.status = 404;
        throw error;
      }

      const oldSubscription = await ParkingSubscription.findOne({
        parkingId: req.params.parkingId,
        customerId: req.params.customerId,
        vehicleId: oldVehicle._id,
        status: 'active',
      }).session(session);
      const nextStartDate = oldSubscription
        ? getBillingPeriod(oldSubscription.startDate).nextStart
        : fields.parkingStartDate;
      const monthlyRate = oldSubscription?.monthlyRate ?? Number(req.body.monthlyRate);
      if (!Number.isFinite(monthlyRate) || monthlyRate < 0) {
        const error = new Error('A non-negative monthlyRate is required when the previous vehicle has no subscription');
        error.status = 400;
        throw error;
      }

      if (oldSubscription) {
        await generateMissingDues(oldSubscription._id, { session });
        oldSubscription.status = 'ended';
        oldSubscription.endedAt = nextStartDate;
        const finalPeriod = getFinalBillingPeriod(oldSubscription.startDate, nextStartDate);
        if (oldSubscription.pendingRateChange?.effectiveFrom
          && new Date(oldSubscription.pendingRateChange.effectiveFrom) > finalPeriod.start) {
          oldSubscription.pendingRateChange = undefined;
        }
        await oldSubscription.save({ session });
      }

      oldVehicle.status = 'inactive';
      await oldVehicle.save({ session });

      [replacement] = await Vehicle.create(
        [{
          ...fields,
          parkingStartDate: nextStartDate,
          parkingId: req.params.parkingId,
          customerId: req.params.customerId,
        }],
        { session },
      );
      await ParkingSubscription.create([{
        parkingId: req.params.parkingId,
        customerId: req.params.customerId,
        vehicleId: replacement._id,
        monthlyRate,
        startDate: nextStartDate,
        billingCycleDay: nextStartDate.getUTCDate(),
        createdBy: req.user.id,
      }], { session });
    });

    return res.status(201).json({ vehicle: replacement });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ message: error.message });
    }
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    if (isDuplicateRegistration(error)) {
      return res.status(409).json({ message: 'An active vehicle already uses this registration number' });
    }
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    if (isTransactionUnsupported(error)) {
      return res.status(503).json({
        message: 'MongoDB transactions require a replica set. Configure local MongoDB as a replica set before replacing vehicles.',
      });
    }

    return res.status(500).json({ message: 'Could not replace vehicle' });
  } finally {
    if (session) await session.endSession();
  }
};

const searchVehicles = async (req, res) => {
  const search = (req.query.search || '').trim();
  if (!search) {
    return res.json({ vehicles: [] });
  }

  try {
    const matcher = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const vehicles = await Vehicle.find({
      parkingId: req.params.parkingId,
      registrationNumber: matcher,
    })
      .sort({ registrationNumber: 1 })
      .limit(50)
      .populate('customerId', 'fullName primaryPhone status')
      .lean();

    return res.json({
      vehicles: vehicles.map((vehicle) => ({
        ...vehicle,
        customer: vehicle.customerId,
        customerId: vehicle.customerId?._id,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not search vehicles' });
  }
};

module.exports = {
  createVehicle,
  listCustomerVehicles,
  updateVehicle,
  deactivateVehicle,
  replaceVehicle,
  searchVehicles,
};
