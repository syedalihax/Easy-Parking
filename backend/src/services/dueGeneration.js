const MonthlyDue = require('../models/MonthlyDue');
const ParkingSubscription = require('../models/ParkingSubscription');
const { getCompletedBillingPeriods, getFinalBillingPeriod } = require('../utils/billingPeriods');
const { isAfter, startOfDay } = require('date-fns');
const { UTCDate } = require('@date-fns/utc');

const isDuplicateKey = (error) => error?.code === 11000;

const generateMissingDues = async (subscriptionId, { now = new Date(), session } = {}) => {
  const subscriptionQuery = ParkingSubscription.findById(subscriptionId);
  if (session) subscriptionQuery.session(session);
  const subscription = await subscriptionQuery;
  if (!subscription || subscription.status === 'paused') return [];

  const latestDueQuery = MonthlyDue.findOne({ subscriptionId: subscription._id })
    .sort({ billingPeriodStart: -1 });
  if (session) latestDueQuery.session(session);
  const latestDue = await latestDueQuery.lean();
  let duePeriods;
  if (subscription.status === 'ended') {
    if (!subscription.endedAt) return [];
    const finalPeriod = getFinalBillingPeriod(subscription.startDate, subscription.endedAt);
    if (isAfter(finalPeriod.nextStart, startOfDay(new UTCDate(new Date(now).getTime())))) return [];
    if (latestDue && latestDue.billingPeriodStart >= finalPeriod.start) return [];
    duePeriods = [{ start: finalPeriod.start, end: finalPeriod.end }];
  } else {
    duePeriods = getCompletedBillingPeriods(
      subscription.startDate,
      latestDue?.billingPeriodEnd,
      now,
    );
  }
  const created = [];

  for (const period of duePeriods) {
    const pending = subscription.pendingRateChange;
    const rateChangeIsEffective = pending?.effectiveFrom
      && period.start.getTime() >= startOfDay(new UTCDate(new Date(pending.effectiveFrom).getTime())).getTime();
    const amountDue = rateChangeIsEffective ? pending.newRate : subscription.monthlyRate;
    try {
      const [due] = await MonthlyDue.create([{
        parkingId: subscription.parkingId,
        customerId: subscription.customerId,
        vehicleId: subscription.vehicleId,
        subscriptionId: subscription._id,
        billingPeriodStart: period.start,
        billingPeriodEnd: period.end,
        dueDate: period.end,
        amountDue,
        amountPaid: 0,
        outstandingAmount: amountDue,
        status: 'pending',
      }], session ? { session } : undefined);
      created.push(due);

      if (rateChangeIsEffective) {
        subscription.monthlyRate = pending.newRate;
      }
      if (rateChangeIsEffective || subscription.status === 'ended') {
        subscription.pendingRateChange = undefined;
        await subscription.save(session ? { session } : undefined);
      }
    } catch (error) {
      if (!isDuplicateKey(error) || session) throw error;
    }
  }

  return created;
};

const getCustomerDues = async ({ parkingId, customerId, now = new Date() }) => {
  const subscriptions = await ParkingSubscription.find({ parkingId, customerId }).select('_id').lean();
  for (const subscription of subscriptions) {
    await generateMissingDues(subscription._id, { now });
  }

  return MonthlyDue.find({ parkingId, customerId })
    .sort({ billingPeriodStart: -1, createdAt: -1 })
    .populate('vehicleId', 'registrationNumber')
    .lean();
};

module.exports = { generateMissingDues, getCustomerDues };
