const mongoose = require('mongoose');
const DailyParkingRecord = require('../models/DailyParkingRecord');
const Parking = require('../models/Parking');
const Payment = require('../models/Payment');
const {
  isNonNegativeMoney,
  resolveDailyRate,
  validateRateCard,
} = require('../utils/dailyRates');
const { parseEntryTimes } = require('../utils/entryTimes');

const validMethods = ['cash', 'easypaisa', 'jazzcash'];

const rateCardResponse = (parking) => ({
  dailyParkingRate: parking.dailyParkingRate,
  rates: (parking.dailyRates || []).map(({ vehicleType, rate }) => ({ vehicleType, rate })),
});

const getDailyRate = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.parkingId)
      .select('dailyParkingRate dailyRates')
      .lean();
    if (!parking) return res.status(404).json({ message: 'Parking not found' });
    return res.json(rateCardResponse(parking));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid parking ID' });
    console.error('Daily parking rate lookup failed:', error);
    return res.status(500).json({ message: 'Could not load daily parking rate' });
  }
};

// PATCH keeps the old `{ dailyParkingRate }` contract working for the current
// UI, and additionally accepts `{ rates }` to update the per-type card.
const updateDailyRate = async (req, res) => {
  const body = req.body || {};
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(body, 'dailyParkingRate')) {
    if (!isNonNegativeMoney(body.dailyParkingRate)) {
      return res.status(400).json({ message: 'dailyParkingRate must be a non-negative number' });
    }
    updates.dailyParkingRate = body.dailyParkingRate;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'rates')) {
    try {
      updates.dailyRates = validateRateCard(body.rates);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'Provide dailyParkingRate, rates, or both' });
  }

  try {
    const parking = await Parking.findByIdAndUpdate(
      req.params.parkingId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).select('dailyParkingRate dailyRates').lean();
    if (!parking) return res.status(404).json({ message: 'Parking not found' });
    return res.json(rateCardResponse(parking));
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Daily parking rate update failed:', error);
    return res.status(500).json({ message: 'Could not update daily parking rate' });
  }
};

// Admin-only replacement of the whole card: vehicle types omitted from `rates`
// are removed. Existing records are untouched because fees are snapshotted.
const replaceRateCard = async (req, res) => {
  const body = req.body || {};
  if (!Object.prototype.hasOwnProperty.call(body, 'rates')) {
    return res.status(400).json({ message: 'rates is required' });
  }

  let rates;
  try {
    rates = validateRateCard(body.rates);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const updates = { dailyRates: rates };
  if (Object.prototype.hasOwnProperty.call(body, 'dailyParkingRate')) {
    if (!isNonNegativeMoney(body.dailyParkingRate)) {
      return res.status(400).json({ message: 'dailyParkingRate must be a non-negative number' });
    }
    updates.dailyParkingRate = body.dailyParkingRate;
  }

  try {
    const parking = await Parking.findByIdAndUpdate(
      req.params.parkingId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    ).select('dailyParkingRate dailyRates').lean();
    if (!parking) return res.status(404).json({ message: 'Parking not found' });
    return res.json(rateCardResponse(parking));
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Daily parking rate card update failed:', error);
    return res.status(500).json({ message: 'Could not update daily parking rate card' });
  }
};

const createEntry = async (req, res) => {
  const body = req.body || {};
  const { vehicleNumber, vehicleType = '', customerName = '', customerPhone = '', notes = '' } = body;
  if (typeof vehicleNumber !== 'string' || !vehicleNumber.trim()) {
    return res.status(400).json({ message: 'Vehicle number is required' });
  }

  // Optional back-dating: absent fields stay null so the model defaults apply.
  let entryTimes;
  try {
    entryTimes = parseEntryTimes(body);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  try {
    const normalizedNumber = vehicleNumber.trim().toUpperCase();
    // Only an entry that is still parked can clash with an active record; a
    // backdated record that already exited is history and must be allowed.
    if (!entryTimes.exitDateTime) {
      const activeRecord = await DailyParkingRecord.exists({
        parkingId: req.params.parkingId,
        vehicleNumber: normalizedNumber,
        exitDateTime: { $exists: false },
      });
      if (activeRecord) return res.status(409).json({ message: 'This vehicle already has an active parking entry' });
    }

    const parking = await Parking.findById(req.params.parkingId)
      .select('dailyParkingRate dailyRates')
      .lean();
    if (!parking) return res.status(404).json({ message: 'Parking not found' });

    // Price the entry now and snapshot the fee + matched type on the record, so
    // later rate-card edits never rewrite history.
    const pricing = resolveDailyRate({
      vehicleType: typeof vehicleType === 'string' ? vehicleType : '',
      rates: parking.dailyRates,
      defaultRate: parking.dailyParkingRate,
    });

    const payload = {
      parkingId: req.params.parkingId,
      vehicleNumber: normalizedNumber,
      vehicleType: pricing.vehicleType,
      customerName,
      customerPhone,
      notes,
      fee: pricing.rate,
    };
    if (entryTimes.entryDateTime) payload.entryDateTime = entryTimes.entryDateTime;
    if (entryTimes.exitDateTime) payload.exitDateTime = entryTimes.exitDateTime;

    const record = await DailyParkingRecord.create(payload);

    return res.status(201).json({
      record,
      pricing: { rate: pricing.rate, vehicleType: pricing.vehicleType, matched: pricing.matched },
    });
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Daily parking entry creation failed:', error);
    return res.status(500).json({ message: 'Could not register daily parking entry' });
  }
};

const listRecords = async (req, res) => {
  const { paymentStatus, startDate, endDate } = req.query;
  if (paymentStatus && !['unpaid', 'paid'].includes(paymentStatus)) {
    return res.status(400).json({ message: 'paymentStatus must be unpaid or paid' });
  }
  const query = { parkingId: req.params.parkingId };
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (startDate || endDate) {
    const entryDateTime = {};
    if (startDate) {
      const start = new Date(startDate);
      if (Number.isNaN(start.getTime())) return res.status(400).json({ message: 'startDate must be a valid date' });
      start.setHours(0, 0, 0, 0);
      entryDateTime.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (Number.isNaN(end.getTime())) return res.status(400).json({ message: 'endDate must be a valid date' });
      end.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      entryDateTime.$lt = end;
    }
    query.entryDateTime = entryDateTime;
  }
  try {
    const records = await DailyParkingRecord.find(query).sort({ entryDateTime: -1 }).lean();
    return res.json({ records });
  } catch (error) {
    console.error('Daily parking history lookup failed:', error);
    return res.status(500).json({ message: 'Could not load daily parking history' });
  }
};

const listActiveRecords = async (req, res) => {
  try {
    const records = await DailyParkingRecord.find({
      parkingId: req.params.parkingId,
      exitDateTime: { $exists: false },
    }).sort({ entryDateTime: 1 }).lean();
    return res.json({ records });
  } catch (error) {
    console.error('Active daily parking lookup failed:', error);
    return res.status(500).json({ message: 'Could not load currently parked vehicles' });
  }
};

const recordExit = async (req, res) => {
  try {
    const record = await DailyParkingRecord.findOneAndUpdate(
      {
        _id: req.params.recordId,
        parkingId: req.params.parkingId,
        exitDateTime: { $exists: false },
      },
      { $set: { exitDateTime: new Date() } },
      { returnDocument: 'after' },
    ).lean();
    if (!record) return res.status(404).json({ message: 'Active daily parking record not found' });
    return res.json({ record });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid daily parking record ID' });
    console.error('Daily parking exit update failed:', error);
    return res.status(500).json({ message: 'Could not record vehicle exit' });
  }
};

const recordPayment = async (req, res) => {
  const { method, referenceNumber = '', notes = '' } = req.body;
  if (!validMethods.includes(method)) {
    return res.status(400).json({ message: 'Payment method must be cash, easypaisa, or jazzcash' });
  }

  let session;
  try {
    session = await mongoose.startSession();
    let record;
    let payment = null;

    await session.withTransaction(async () => {
      record = await DailyParkingRecord.findOneAndUpdate(
        { _id: req.params.recordId, parkingId: req.params.parkingId, paymentStatus: 'unpaid' },
        { $set: { paymentStatus: 'paid', paymentMethod: method, receivedBy: req.user.id } },
        { returnDocument: 'after', runValidators: true, session },
      ).lean();

      if (!record) {
        const notFound = new Error('Unpaid daily parking record not found');
        notFound.status = 404;
        throw notFound;
      }

      // A zero-fee entry has nothing to collect, so no ledger row is written.
      if (record.fee > 0) {
        [payment] = await Payment.create([{
          parkingId: record.parkingId,
          source: 'daily',
          dailyRecordId: record._id,
          amount: record.fee,
          method,
          receivedBy: req.user.id,
          referenceNumber: String(referenceNumber).trim(),
          notes: String(notes).trim(),
          paymentDate: new Date(),
        }], { session });
      }
    });

    return res.json({ record, payment });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ message: error.message });
    if (error.code === 11000) {
      return res.status(409).json({ message: 'A payment is already recorded for this parking entry' });
    }
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Daily parking payment failed:', error);
    return res.status(500).json({ message: 'Could not record daily parking payment' });
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = {
  getDailyRate,
  updateDailyRate,
  replaceRateCard,
  createEntry,
  listRecords,
  listActiveRecords,
  recordExit,
  recordPayment,
};
