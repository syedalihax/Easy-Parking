const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const Customer = require('../models/Customer');
const MonthlyDue = require('../models/MonthlyDue');
const Payment = require('../models/Payment');
const PaymentAllocation = require('../models/PaymentAllocation');
const {
  allocatePayment,
  allocatePaymentInSession,
  previewPaymentAllocation,
} = require('../services/paymentAllocation');
const { isTransactionUnsupported } = require('../utils/mongoErrors');

const paymentDetails = async (paymentId, parkingId, customerId) => {
  const payment = await Payment.findOne({ _id: paymentId, parkingId, customerId })
    .populate('receivedBy', 'fullName')
    .lean();
  if (!payment) return null;
  const allocations = await PaymentAllocation.find({ parkingId, paymentId: payment._id })
    .populate('monthlyDueId', 'billingPeriodStart billingPeriodEnd amountDue amountPaid outstandingAmount status')
    .sort({ createdAt: 1 })
    .lean();
  return { ...payment, allocations };
};

const createPayment = async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Payment amount must be a positive number' });
  }
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
      status: 'active',
    }).select('_id');
    if (!customer) return res.status(404).json({ message: 'Active customer not found' });

    const result = await allocatePayment({
      parkingId: req.params.parkingId,
      customerId: customer._id,
      amount,
      method: req.body.method,
      receivedBy: req.user.id,
      referenceNumber: req.body.referenceNumber,
      notes: req.body.notes,
      manualDueOrder: req.body.manualDueOrder,
    });
    const payment = await paymentDetails(result.payment._id, req.params.parkingId, customer._id);
    return res.status(201).json({ payment, unallocatedAmount: result.unallocatedAmount });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (isTransactionUnsupported(error)) {
      return res.status(503).json({ message: 'MongoDB transactions require a replica set to record payments safely' });
    }
    return res.status(500).json({ message: 'Could not record payment' });
  }
};

const previewPayment = async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ message: 'Payment amount must be a positive number' });
  }
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
      status: 'active',
    }).select('_id');
    if (!customer) return res.status(404).json({ message: 'Active customer not found' });
    const preview = await previewPaymentAllocation({
      parkingId: req.params.parkingId,
      customerId: customer._id,
      amount,
      manualDueOrder: req.body.manualDueOrder,
    });
    return res.json(preview);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid customer or parking ID' });
    return res.status(500).json({ message: 'Could not preview payment allocation' });
  }
};

const listPayments = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
    }).select('_id');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const payments = await Payment.find({ parkingId: req.params.parkingId, customerId: customer._id })
      .populate('receivedBy', 'fullName')
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();
    const allocations = await PaymentAllocation.find({
      parkingId: req.params.parkingId,
      paymentId: { $in: payments.map((payment) => payment._id) },
    }).populate('monthlyDueId', 'billingPeriodStart billingPeriodEnd amountDue status').lean();
    const allocationsByPayment = new Map();
    for (const allocation of allocations) {
      const current = allocationsByPayment.get(String(allocation.paymentId)) || [];
      current.push(allocation);
      allocationsByPayment.set(String(allocation.paymentId), current);
    }
    return res.json({
      payments: payments.map((payment) => ({
        ...payment,
        allocations: allocationsByPayment.get(String(payment._id)) || [],
      })),
    });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid customer or parking ID' });
    return res.status(500).json({ message: 'Could not load payment history' });
  }
};

const getPayment = async (req, res) => {
  try {
    const payment = await paymentDetails(req.params.paymentId, req.params.parkingId, req.params.customerId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    const corrections = await AuditLog.find({
      parkingId: req.params.parkingId,
      targetCollection: 'Payment',
      targetId: payment._id,
    }).populate('performedBy approvedBy', 'fullName').sort({ createdAt: -1 }).lean();
    return res.json({ payment, corrections });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid payment ID' });
    return res.status(500).json({ message: 'Could not load payment details' });
  }
};

const requestCorrection = async (req, res) => {
  const correctedAmount = Number(req.body.correctedAmount);
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!Number.isFinite(correctedAmount) || correctedAmount <= 0 || !reason) {
    return res.status(400).json({ message: 'A positive corrected amount and reason are required' });
  }

  try {
    const payment = await Payment.findOne({
      _id: req.params.paymentId,
      parkingId: req.params.parkingId,
      status: 'active',
    }).lean();
    if (!payment) return res.status(404).json({ message: 'Active payment not found' });

    const hasPending = await AuditLog.exists({
      parkingId: req.params.parkingId,
      targetCollection: 'Payment',
      targetId: payment._id,
      actionType: 'payment_correction',
      'newValue.approvalStatus': 'pending',
    });
    if (hasPending) return res.status(409).json({ message: 'A correction request is already pending for this payment' });

    const allocations = await PaymentAllocation.find({ parkingId: req.params.parkingId, paymentId: payment._id }).lean();
    const auditLog = await AuditLog.create({
      parkingId: req.params.parkingId,
      actionType: 'payment_correction',
      performedBy: req.user.id,
      approvedBy: null,
      targetCollection: 'Payment',
      targetId: payment._id,
      reason,
      previousValue: {
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        method: payment.method,
        referenceNumber: payment.referenceNumber,
        notes: payment.notes,
        status: payment.status,
        allocations: allocations.map(({ monthlyDueId, allocatedAmount }) => ({ monthlyDueId, allocatedAmount })),
      },
      newValue: { correctedAmount, approvalStatus: 'pending' },
    });
    return res.status(201).json({ correction: auditLog });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'A correction request is already pending for this payment' });
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Could not request payment correction' });
  }
};

const approveCorrection = async (req, res) => {
  let session;
  try {
    session = await mongoose.startSession();
    let response;
    await session.withTransaction(async () => {
      const correction = await AuditLog.findOne({
        _id: req.params.auditLogId,
        parkingId: req.params.parkingId,
        targetCollection: 'Payment',
        targetId: req.params.paymentId,
        actionType: 'payment_correction',
        'newValue.approvalStatus': 'pending',
      }).session(session);
      if (!correction) throw Object.assign(new Error('Pending correction request not found'), { status: 404 });

      const originalPayment = await Payment.findOne({
        _id: correction.targetId,
        parkingId: req.params.parkingId,
        status: 'active',
      }).session(session);
      if (!originalPayment) throw Object.assign(new Error('Original payment is not active'), { status: 409 });

      const allocations = await PaymentAllocation.find({
        parkingId: req.params.parkingId,
        paymentId: originalPayment._id,
      }).session(session);
      for (const allocation of allocations) {
        const due = await MonthlyDue.findOne({
          _id: allocation.monthlyDueId,
          parkingId: req.params.parkingId,
          customerId: originalPayment.customerId,
        }).session(session);
        if (!due || due.amountPaid < allocation.allocatedAmount) {
          throw Object.assign(new Error('Payment allocation history is inconsistent; correction was not applied'), { status: 409 });
        }
        due.amountPaid -= allocation.allocatedAmount;
        due.outstandingAmount = due.amountDue - due.amountPaid;
        due.status = due.outstandingAmount === 0 ? 'paid'
          : due.amountPaid === 0 ? 'pending' : 'partially_paid';
        await due.save({ session });
      }

      originalPayment.status = 'reversed';
      await originalPayment.save({ session });
      const replacementResult = await allocatePaymentInSession({
        parkingId: req.params.parkingId,
        customerId: originalPayment.customerId,
        amount: correction.newValue.correctedAmount,
        method: originalPayment.method,
        receivedBy: req.user.id,
        referenceNumber: originalPayment.referenceNumber,
        notes: `Correction for payment ${originalPayment._id}: ${correction.reason}`,
        session,
      });

      correction.approvedBy = req.user.id;
      correction.newValue = {
        ...correction.newValue,
        approvalStatus: 'approved',
        replacementPaymentId: replacementResult.payment._id,
        unallocatedAmount: replacementResult.unallocatedAmount,
        approvedAt: new Date(),
      };
      correction.markModified('newValue');
      await correction.save({ session });
      response = {
        originalPaymentId: originalPayment._id,
        replacementPaymentId: replacementResult.payment._id,
        unallocatedAmount: replacementResult.unallocatedAmount,
      };
    });
    return res.json(response);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    if (isTransactionUnsupported(error)) {
      return res.status(503).json({ message: 'MongoDB transactions require a replica set to approve payment corrections safely' });
    }
    return res.status(500).json({ message: 'Could not approve payment correction' });
  } finally {
    if (session) await session.endSession();
  }
};

const rejectCorrection = async (req, res) => {
  try {
    const correction = await AuditLog.findOne({
      _id: req.params.auditLogId,
      parkingId: req.params.parkingId,
      targetCollection: 'Payment',
      targetId: req.params.paymentId,
      actionType: 'payment_correction',
      'newValue.approvalStatus': 'pending',
    });
    if (!correction) return res.status(404).json({ message: 'Pending correction request not found' });
    correction.newValue = {
      ...correction.newValue,
      approvalStatus: 'rejected',
      rejectedBy: req.user.id,
      rejectedAt: new Date(),
    };
    correction.markModified('newValue');
    await correction.save();
    return res.json({ correction });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid correction request ID' });
    return res.status(500).json({ message: 'Could not reject payment correction' });
  }
};

// TODO: if payment disputes become frequent, consider a dedicated disputed-due workflow.
module.exports = {
  createPayment,
  previewPayment,
  listPayments,
  getPayment,
  requestCorrection,
  approveCorrection,
  rejectCorrection,
};
