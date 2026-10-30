const Customer = require('../models/Customer');
const MonthlyDue = require('../models/MonthlyDue');
const ParkingSubscription = require('../models/ParkingSubscription');
const Vehicle = require('../models/Vehicle');
const { generateMissingDues, getCustomerDues } = require('../services/dueGeneration');
const { getBillingPeriod, getFinalBillingPeriod } = require('../utils/billingPeriods');
const { isTransactionUnsupported } = require('../utils/mongoErrors');

const validRate = (rate) => Number.isFinite(rate) && rate >= 0;

const createSubscription = async (req, res) => {
  const monthlyRate = Number(req.body.monthlyRate);
  const requestedStartDate = new Date(req.body.startDate);
  if (!validRate(monthlyRate) || !req.body.startDate || Number.isNaN(requestedStartDate.getTime())) {
    return res.status(400).json({ message: 'A valid startDate and non-negative monthlyRate are required' });
  }

  try {
    const [customer, vehicle, existing] = await Promise.all([
      Customer.findOne({ _id: req.params.customerId, parkingId: req.params.parkingId, status: 'active' }).select('_id'),
      Vehicle.findOne({
        _id: req.params.vehicleId,
        parkingId: req.params.parkingId,
        customerId: req.params.customerId,
        status: 'active',
      }).select('_id parkingStartDate'),
      ParkingSubscription.findOne({
        parkingId: req.params.parkingId,
        vehicleId: req.params.vehicleId,
      }).select('_id'),
    ]);
    if (!customer || !vehicle) return res.status(404).json({ message: 'Active customer vehicle not found' });
    if (existing) return res.status(409).json({ message: 'This vehicle already has subscription history; add a new vehicle record instead' });
    const startDate = new Date(vehicle.parkingStartDate);
    if (startDate.toISOString().slice(0, 10) !== requestedStartDate.toISOString().slice(0, 10)) {
      return res.status(400).json({ message: 'Subscription startDate must match the vehicle parking start date' });
    }

    const subscription = await ParkingSubscription.create({
      parkingId: req.params.parkingId,
      customerId: customer._id,
      vehicleId: vehicle._id,
      monthlyRate,
      startDate,
      billingCycleDay: startDate.getUTCDate(),
      createdBy: req.user.id,
    });
    return res.status(201).json({ subscription });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'This vehicle already has subscription history; add a new vehicle record instead' });
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Could not create subscription' });
  }
};

const listSubscriptions = async (req, res) => {
  try {
    const subscriptions = await ParkingSubscription.find({
      parkingId: req.params.parkingId,
      customerId: req.params.customerId,
    }).populate('vehicleId', 'registrationNumber status').sort({ createdAt: -1 }).lean();
    return res.json({ subscriptions });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid customer or parking ID' });
    return res.status(500).json({ message: 'Could not load subscriptions' });
  }
};

const changeRate = async (req, res) => {
  const monthlyRate = Number(req.body.monthlyRate);
  const timing = req.body.timing;
  if (!validRate(monthlyRate) || !['immediate', 'next_cycle'].includes(timing)) {
    return res.status(400).json({ message: 'A non-negative monthlyRate and valid timing are required' });
  }
  try {
    const subscription = await ParkingSubscription.findOne({
      _id: req.params.subscriptionId,
      parkingId: req.params.parkingId,
      customerId: req.params.customerId,
      status: 'active',
    });
    if (!subscription) return res.status(404).json({ message: 'Active subscription not found' });

    if (timing === 'immediate') {
      subscription.monthlyRate = monthlyRate;
      subscription.pendingRateChange = undefined;
    } else {
      subscription.pendingRateChange = {
        newRate: monthlyRate,
        effectiveFrom: getBillingPeriod(subscription.startDate).nextStart,
      };
    }
    await subscription.save();
    return res.json({ subscription });
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Could not change subscription rate' });
  }
};

const endSubscription = async (req, res) => {
  try {
    const subscription = await ParkingSubscription.findOne({
      _id: req.params.subscriptionId,
      parkingId: req.params.parkingId,
      customerId: req.params.customerId,
      status: 'active',
    });
    if (!subscription) return res.status(404).json({ message: 'Active subscription not found' });
    await generateMissingDues(subscription._id);
    const endedAt = new Date();
    const finalPeriod = getFinalBillingPeriod(subscription.startDate, endedAt);
    subscription.status = 'ended';
    subscription.endedAt = endedAt;
    if (subscription.pendingRateChange?.effectiveFrom
      && new Date(subscription.pendingRateChange.effectiveFrom) > finalPeriod.start) {
      subscription.pendingRateChange = undefined;
    }
    await subscription.save();
    return res.json({ subscription });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid subscription ID' });
    return res.status(500).json({ message: 'Could not end subscription' });
  }
};

const listDues = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
    }).select('_id');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const [dues, subscriptions] = await Promise.all([
      getCustomerDues({ parkingId: req.params.parkingId, customerId: customer._id }),
      ParkingSubscription.find({
        parkingId: req.params.parkingId,
        customerId: customer._id,
        status: { $in: ['active', 'ended'] },
      }).select('monthlyRate pendingRateChange status vehicleId'),
    ]);
    const outstandingTotal = dues.reduce((total, due) => total + due.outstandingAmount, 0);
    return res.json({ dues, subscriptions, outstandingTotal });
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      return res.status(503).json({ message: 'MongoDB replica-set configuration is required for billing operations' });
    }
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid customer or parking ID' });
    return res.status(500).json({ message: 'Could not load dues' });
  }
};

module.exports = { createSubscription, listSubscriptions, changeRate, endSubscription, listDues };
