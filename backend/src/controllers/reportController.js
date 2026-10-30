const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const DailyParkingRecord = require('../models/DailyParkingRecord');
const MonthlyDue = require('../models/MonthlyDue');
const ParkingSubscription = require('../models/ParkingSubscription');
const Payment = require('../models/Payment');
const PaymentAllocation = require('../models/PaymentAllocation');
const Vehicle = require('../models/Vehicle');
const toCsv = require('../utils/toCsv');

const dateRange = (query, fieldName) => {
  if (!query.startDate && !query.endDate) return null;
  const range = {};
  if (query.startDate) {
    const start = new Date(query.startDate);
    if (Number.isNaN(start.getTime())) throw new Error('startDate must be a valid date');
    start.setHours(0, 0, 0, 0);
    range.$gte = start;
  }
  if (query.endDate) {
    const end = new Date(query.endDate);
    if (Number.isNaN(end.getTime())) throw new Error('endDate must be a valid date');
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    range.$lt = end;
  }
  return { [fieldName]: range };
};

const sendReport = (req, res, name, rows) => {
  if (req.query.format === 'csv') {
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}.csv"`,
    });
    return res.send(toCsv(rows));
  }
  return res.json(rows);
};

const reportError = (res, error, fallback) => {
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid report ID' });
  if (error.message.includes('must be a valid date')) return res.status(400).json({ message: error.message });
  console.error(`${fallback}:`, error);
  return res.status(500).json({ message: fallback });
};

const listCustomersReport = async (req, res) => {
  const { status = 'all' } = req.query;
  if (!['active', 'inactive', 'all'].includes(status)) {
    return res.status(400).json({ message: 'status must be active, inactive, or all' });
  }
  try {
    const query = { parkingId: req.params.parkingId };
    if (status !== 'all') query.status = status;
    const customers = await Customer.find(query).sort({ fullName: 1 }).lean();
    return sendReport(req, res, 'customers', customers.map(({ _id, fullName, primaryPhone, secondaryPhone, address, registrationDate, status: customerStatus }) => ({
      customerId: _id, fullName, primaryPhone, secondaryPhone, address, registrationDate, status: customerStatus,
    })));
  } catch (error) {
    return reportError(res, error, 'Could not load customer report');
  }
};

const listActiveVehiclesReport = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ parkingId: req.params.parkingId, status: 'active' })
      .populate('customerId', 'fullName primaryPhone')
      .sort({ registrationNumber: 1 })
      .lean();
    const subscriptions = await ParkingSubscription.find({
      parkingId: req.params.parkingId,
      vehicleId: { $in: vehicles.map(({ _id }) => _id) },
      status: 'active',
    }).select('vehicleId monthlyRate').lean();
    const rates = new Map(subscriptions.map(({ vehicleId, monthlyRate }) => [String(vehicleId), monthlyRate]));
    const rows = vehicles.map((vehicle) => ({
      vehicleId: vehicle._id,
      registrationNumber: vehicle.registrationNumber,
      vehicleType: vehicle.vehicleType,
      customerName: vehicle.customerId?.fullName || '',
      customerPhone: vehicle.customerId?.primaryPhone || '',
      monthlyRate: rates.get(String(vehicle._id)) ?? '',
      parkingStartDate: vehicle.parkingStartDate,
    }));
    return sendReport(req, res, 'active-vehicles', rows);
  } catch (error) {
    return reportError(res, error, 'Could not load active vehicle report');
  }
};

const listPendingDuesReport = async (req, res) => {
  try {
    const dues = await MonthlyDue.find({ parkingId: req.params.parkingId, status: { $ne: 'paid' } })
      .populate('customerId', 'fullName primaryPhone')
      .populate('vehicleId', 'registrationNumber')
      .sort({ dueDate: 1 })
      .lean();
    return sendReport(req, res, 'pending-dues', dues.map((due) => ({
      dueId: due._id,
      customerName: due.customerId?.fullName || '',
      customerPhone: due.customerId?.primaryPhone || '',
      vehicleNumber: due.vehicleId?.registrationNumber || '',
      billingPeriodStart: due.billingPeriodStart,
      billingPeriodEnd: due.billingPeriodEnd,
      dueDate: due.dueDate,
      amountDue: due.amountDue,
      amountPaid: due.amountPaid,
      outstandingAmount: due.outstandingAmount,
      status: due.status,
    })));
  } catch (error) {
    return reportError(res, error, 'Could not load pending dues report');
  }
};

const listOutstandingBalancesReport = async (req, res) => {
  try {
    const grouped = await MonthlyDue.aggregate([
      { $match: { parkingId: new mongoose.Types.ObjectId(req.params.parkingId), status: { $ne: 'paid' }, outstandingAmount: { $gt: 0 } } },
      { $group: { _id: '$customerId', outstandingAmount: { $sum: '$outstandingAmount' } } },
      { $sort: { outstandingAmount: -1 } },
    ]);
    const customers = await Customer.find({ parkingId: req.params.parkingId, _id: { $in: grouped.map(({ _id }) => _id) } })
      .select('fullName primaryPhone status').lean();
    const customerMap = new Map(customers.map((customer) => [String(customer._id), customer]));
    const rows = grouped.map(({ _id, outstandingAmount }) => {
      const customer = customerMap.get(String(_id));
      return {
        customerId: _id,
        customerName: customer?.fullName || '',
        customerPhone: customer?.primaryPhone || '',
        customerStatus: customer?.status || '',
        outstandingAmount,
      };
    });
    return sendReport(req, res, 'outstanding-balances', rows);
  } catch (error) {
    return reportError(res, error, 'Could not load outstanding balances report');
  }
};

const listPaymentHistoryReport = async (req, res) => {
  const { method } = req.query;
  if (method && !['cash', 'easypaisa', 'jazzcash'].includes(method)) {
    return res.status(400).json({ message: 'method must be cash, easypaisa, or jazzcash' });
  }
  try {
    const query = { parkingId: req.params.parkingId };
    if (method) query.method = method;
    Object.assign(query, dateRange(req.query, 'paymentDate') || {});
    const payments = await Payment.find(query).populate('customerId', 'fullName primaryPhone')
      .populate('receivedBy', 'fullName').sort({ paymentDate: -1 }).lean();
    const rows = payments.map((payment) => ({
      paymentId: payment._id,
      paymentDate: payment.paymentDate,
      customerName: payment.customerId?.fullName || '',
      customerPhone: payment.customerId?.primaryPhone || '',
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      receivedBy: payment.receivedBy?.fullName || '',
      referenceNumber: payment.referenceNumber,
      notes: payment.notes,
    }));
    return sendReport(req, res, 'payment-history', rows);
  } catch (error) {
    return reportError(res, error, 'Could not load payment history report');
  }
};

const listDailyParkingHistoryReport = async (req, res) => {
  try {
    const query = { parkingId: req.params.parkingId, ...(dateRange(req.query, 'entryDateTime') || {}) };
    const records = await DailyParkingRecord.find(query).sort({ entryDateTime: -1 }).lean();
    return sendReport(req, res, 'daily-parking-history', records.map((record) => ({
      recordId: record._id,
      vehicleNumber: record.vehicleNumber,
      vehicleType: record.vehicleType,
      customerName: record.customerName,
      customerPhone: record.customerPhone,
      entryDateTime: record.entryDateTime,
      exitDateTime: record.exitDateTime || '',
      fee: record.fee,
      paymentStatus: record.paymentStatus,
      paymentMethod: record.paymentMethod || '',
      notes: record.notes,
    })));
  } catch (error) {
    return reportError(res, error, 'Could not load daily parking history report');
  }
};

const getCustomerStatement = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.customerId,
      parkingId: req.params.parkingId,
    }).select('_id fullName primaryPhone').lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const [dues, payments] = await Promise.all([
      MonthlyDue.find({ parkingId: req.params.parkingId, customerId: customer._id })
        .populate('vehicleId', 'registrationNumber').lean(),
      Payment.find({ parkingId: req.params.parkingId, customerId: customer._id })
        .populate('receivedBy', 'fullName').lean(),
    ]);
    const allocations = await PaymentAllocation.find({
      parkingId: req.params.parkingId,
      paymentId: { $in: payments.map(({ _id }) => _id) },
    }).populate('monthlyDueId', 'billingPeriodStart billingPeriodEnd').lean();
    const allocationsByPayment = new Map();
    for (const allocation of allocations) {
      const key = String(allocation.paymentId);
      const current = allocationsByPayment.get(key) || [];
      current.push(allocation);
      allocationsByPayment.set(key, current);
    }
    const timeline = [
      ...dues.map((due) => ({
        eventDate: due.dueDate,
        eventType: 'due',
        description: `${due.vehicleId?.registrationNumber || 'Vehicle'} · ${new Date(due.billingPeriodStart).toLocaleDateString()} – ${new Date(due.billingPeriodEnd).toLocaleDateString()}`,
        amount: due.amountDue,
        amountPaid: due.amountPaid,
        outstandingAmount: due.outstandingAmount,
        status: due.status,
        paymentMethod: '',
        referenceNumber: '',
        receivedBy: '',
      })),
      ...payments.map((payment) => {
        const allocationRows = allocationsByPayment.get(String(payment._id)) || [];
        return {
          eventDate: payment.paymentDate,
          eventType: payment.status === 'reversed' ? 'payment_reversed' : 'payment',
          description: allocationRows.map(({ monthlyDueId }) => monthlyDueId
            ? `${new Date(monthlyDueId.billingPeriodStart).toLocaleDateString()} – ${new Date(monthlyDueId.billingPeriodEnd).toLocaleDateString()}`
            : '').filter(Boolean).join('; '),
          amount: payment.amount,
          amountPaid: '',
          outstandingAmount: '',
          status: payment.status,
          paymentMethod: payment.method,
          referenceNumber: payment.referenceNumber,
          receivedBy: payment.receivedBy?.fullName || '',
        };
      }),
    ].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate) || a.eventType.localeCompare(b.eventType))
      .map((row) => ({
        customerId: customer._id,
        customerName: customer.fullName,
        customerPhone: customer.primaryPhone,
        ...row,
      }));
    return sendReport(req, res, 'customer-statement', timeline);
  } catch (error) {
    return reportError(res, error, 'Could not load customer statement');
  }
};

module.exports = {
  listCustomersReport,
  listActiveVehiclesReport,
  listPendingDuesReport,
  listOutstandingBalancesReport,
  listPaymentHistoryReport,
  listDailyParkingHistoryReport,
  getCustomerStatement,
};
