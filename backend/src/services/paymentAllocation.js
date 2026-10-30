const mongoose = require('mongoose');
const MonthlyDue = require('../models/MonthlyDue');
const Payment = require('../models/Payment');
const PaymentAllocation = require('../models/PaymentAllocation');
const { isTransactionUnsupported } = require('../utils/mongoErrors');

const allocatePaymentInSession = async ({
  parkingId,
  customerId,
  amount,
  method,
  receivedBy,
  referenceNumber = '',
  notes = '',
  manualDueOrder,
  session,
}) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error('Payment amount must be a positive number'), { status: 400 });
  }
  if (!['cash', 'easypaisa', 'jazzcash'].includes(method)) {
    throw Object.assign(new Error('Payment method must be cash, easypaisa, or jazzcash'), { status: 400 });
  }
  if (manualDueOrder !== undefined && (!Array.isArray(manualDueOrder)
    || manualDueOrder.some((id) => typeof id !== 'string')
    || new Set(manualDueOrder).size !== manualDueOrder.length)) {
    throw Object.assign(new Error('manualDueOrder must contain unique due IDs'), { status: 400 });
  }

  const payment = new Payment({
    parkingId,
    customerId,
    amount,
    method,
    receivedBy,
    referenceNumber,
    notes,
  });
  await payment.save({ session });

  const duesQuery = {
    parkingId,
    customerId,
    status: { $in: ['pending', 'partially_paid'] },
    outstandingAmount: { $gt: 0 },
  };
  let dues;
  if (manualDueOrder !== undefined) {
    dues = manualDueOrder.length
      ? await MonthlyDue.find({ ...duesQuery, _id: { $in: manualDueOrder } }).session(session)
      : [];
    if (dues.length !== manualDueOrder.length) {
      throw Object.assign(new Error('One or more selected dues are not outstanding for this customer'), { status: 400 });
    }
    const byId = new Map(dues.map((due) => [String(due._id), due]));
    dues = manualDueOrder.map((id) => byId.get(id));
  } else {
    dues = await MonthlyDue.find(duesQuery)
      .sort({ billingPeriodStart: 1, _id: 1 })
      .session(session);
  }

  let remainingPayment = amount;
  for (const due of dues) {
    if (remainingPayment <= 0) break;
    const allocatedAmount = Math.min(remainingPayment, due.outstandingAmount);
    if (allocatedAmount <= 0) continue;

    await PaymentAllocation.create([{
      parkingId,
      paymentId: payment._id,
      monthlyDueId: due._id,
      allocatedAmount,
    }], { session });

    due.amountPaid += allocatedAmount;
    due.outstandingAmount -= allocatedAmount;
    due.status = due.outstandingAmount === 0 ? 'paid' : 'partially_paid';
    await due.save({ session });
    remainingPayment -= allocatedAmount;
  }

  return {
    payment,
    unallocatedAmount: Math.max(remainingPayment, 0),
  };
};

const previewPaymentAllocation = async ({ parkingId, customerId, amount, manualDueOrder }) => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error('Payment amount must be a positive number'), { status: 400 });
  }
  if (manualDueOrder !== undefined && (!Array.isArray(manualDueOrder)
    || manualDueOrder.some((id) => typeof id !== 'string')
    || new Set(manualDueOrder).size !== manualDueOrder.length)) {
    throw Object.assign(new Error('manualDueOrder must contain unique due IDs'), { status: 400 });
  }
  const duesQuery = {
    parkingId,
    customerId,
    status: { $in: ['pending', 'partially_paid'] },
    outstandingAmount: { $gt: 0 },
  };
  let dues;
  if (manualDueOrder !== undefined) {
    dues = manualDueOrder.length
      ? await MonthlyDue.find({ ...duesQuery, _id: { $in: manualDueOrder } }).lean()
      : [];
    if (dues.length !== manualDueOrder.length) {
      throw Object.assign(new Error('One or more selected dues are not outstanding for this customer'), { status: 400 });
    }
    const byId = new Map(dues.map((due) => [String(due._id), due]));
    dues = manualDueOrder.map((id) => byId.get(id));
  } else {
    dues = await MonthlyDue.find(duesQuery).sort({ billingPeriodStart: 1, _id: 1 }).lean();
  }
  let remaining = amount;
  const allocations = [];
  for (const due of dues) {
    if (remaining <= 0) break;
    const allocatedAmount = Math.min(remaining, due.outstandingAmount);
    allocations.push({ monthlyDueId: due._id, allocatedAmount });
    remaining -= allocatedAmount;
  }
  return { allocations, unallocatedAmount: Math.max(remaining, 0) };
};

const allocatePayment = async (options) => {
  let session;
  try {
    session = await mongoose.startSession();
    let result;
    await session.withTransaction(async () => {
      result = await allocatePaymentInSession({ ...options, session });
    });
    return result;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      throw Object.assign(new Error('MongoDB transactions require a replica set to record payments safely'), { status: 503 });
    }
    throw error;
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = { allocatePayment, allocatePaymentInSession, previewPaymentAllocation };
