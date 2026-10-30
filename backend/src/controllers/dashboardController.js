const { addDays, startOfMonth } = require('date-fns');
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const DailyParkingRecord = require('../models/DailyParkingRecord');
const MonthlyDue = require('../models/MonthlyDue');
const ParkingSubscription = require('../models/ParkingSubscription');
const Payment = require('../models/Payment');
const Vehicle = require('../models/Vehicle');
const { getBillingPeriod } = require('../utils/billingPeriods');

const overdueCutoff = (now) => {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  return cutoff;
};

const dueRows = async (parkingId, filter = {}) => MonthlyDue.find({
  parkingId,
  status: { $in: ['pending', 'partially_paid'] },
  ...filter,
})
  .populate('customerId', 'fullName primaryPhone')
  .populate('vehicleId', 'registrationNumber')
  .sort({ dueDate: -1 })
  .lean();

const getDashboard = async (req, res) => {
  const parkingId = req.params.parkingId;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const cutoff = overdueCutoff(now);
  try {
    const [
      totalActiveVehicles,
      totalActiveCustomers,
      pendingCustomers,
      overdueCustomers,
      outstandingResult,
      paymentsResult,
      dailyVehiclesCurrentlyParked,
    ] = await Promise.all([
      Vehicle.countDocuments({ parkingId, status: 'active' }),
      Customer.countDocuments({ parkingId, status: 'active' }),
      MonthlyDue.distinct('customerId', { parkingId, status: { $in: ['pending', 'partially_paid'] } }),
      MonthlyDue.distinct('customerId', {
        parkingId,
        status: { $in: ['pending', 'partially_paid'] },
        dueDate: { $lt: cutoff },
      }),
      MonthlyDue.aggregate([
        { $match: { parkingId: new mongoose.Types.ObjectId(parkingId), status: { $ne: 'paid' } } },
        { $group: { _id: null, total: { $sum: '$outstandingAmount' } } },
      ]),
      Payment.aggregate([
        { $match: { parkingId: new mongoose.Types.ObjectId(parkingId), status: 'active', paymentDate: { $gte: monthStart, $lte: now } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      DailyParkingRecord.countDocuments({ parkingId, exitDateTime: { $exists: false } }),
    ]);

    return res.json({
      totalActiveVehicles,
      totalActiveCustomers,
      customersWithPendingDues: pendingCustomers.length,
      customersWithOverdueDues: overdueCustomers.length,
      totalOutstandingAmount: outstandingResult[0]?.total || 0,
      paymentsReceivedThisPeriod: paymentsResult[0]?.total || 0,
      dailyVehiclesCurrentlyParked,
    });
  } catch (error) {
    console.error('Dashboard summary failed:', error);
    return res.status(500).json({ message: 'Could not load dashboard summary' });
  }
};

const getDashboardReminders = async (req, res) => {
  const parkingId = req.params.parkingId;
  const now = new Date();
  const cutoff = overdueCutoff(now);
  const upcomingLimit = addDays(now, 7);
  try {
    const [pendingDues, overdueDues, partialPayments, subscriptions] = await Promise.all([
      dueRows(parkingId),
      dueRows(parkingId, { dueDate: { $lt: cutoff } }),
      dueRows(parkingId, { status: 'partially_paid' }),
      ParkingSubscription.find({ parkingId, status: 'active' })
        .populate('customerId', 'fullName primaryPhone')
        .populate('vehicleId', 'registrationNumber')
        .lean(),
    ]);
    const upcomingBillingPeriods = subscriptions
      .map((subscription) => ({
        ...subscription,
        currentPeriod: getBillingPeriod(subscription.startDate, now),
      }))
      .filter(({ currentPeriod }) => currentPeriod.end >= now && currentPeriod.end <= upcomingLimit)
      .sort((a, b) => a.currentPeriod.end - b.currentPeriod.end);
    return res.json({ pendingDues, overdueDues, partialPayments, upcomingBillingPeriods });
  } catch (error) {
    console.error('Dashboard reminders failed:', error);
    return res.status(500).json({ message: 'Could not load dashboard reminders' });
  }
};

module.exports = { getDashboard, getDashboardReminders };
