const DailyParkingRecord = require('../models/DailyParkingRecord');
const Parking = require('../models/Parking');

const validMethods = ['cash', 'easypaisa', 'jazzcash'];

const getDailyRate = async (req, res) => {
  try {
    const parking = await Parking.findById(req.params.parkingId).select('dailyParkingRate').lean();
    if (!parking) return res.status(404).json({ message: 'Parking not found' });
    return res.json({ dailyParkingRate: parking.dailyParkingRate });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid parking ID' });
    console.error('Daily parking rate lookup failed:', error);
    return res.status(500).json({ message: 'Could not load daily parking rate' });
  }
};

const updateDailyRate = async (req, res) => {
  const { dailyParkingRate } = req.body;
  if (typeof dailyParkingRate !== 'number' || !Number.isFinite(dailyParkingRate) || dailyParkingRate < 0) {
    return res.status(400).json({ message: 'dailyParkingRate must be a non-negative number' });
  }
  try {
    const parking = await Parking.findByIdAndUpdate(
      req.params.parkingId,
      { $set: { dailyParkingRate } },
      { returnDocument: 'after', runValidators: true },
    ).select('dailyParkingRate').lean();
    if (!parking) return res.status(404).json({ message: 'Parking not found' });
    return res.json({ dailyParkingRate: parking.dailyParkingRate });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid parking ID' });
    console.error('Daily parking rate update failed:', error);
    return res.status(500).json({ message: 'Could not update daily parking rate' });
  }
};

const createEntry = async (req, res) => {
  const { vehicleNumber, vehicleType = '', customerName = '', customerPhone = '', notes = '' } = req.body;
  if (typeof vehicleNumber !== 'string' || !vehicleNumber.trim()) {
    return res.status(400).json({ message: 'Vehicle number is required' });
  }
  try {
    const normalizedNumber = vehicleNumber.trim().toUpperCase();
    const activeRecord = await DailyParkingRecord.exists({
      parkingId: req.params.parkingId,
      vehicleNumber: normalizedNumber,
      exitDateTime: { $exists: false },
    });
    if (activeRecord) return res.status(409).json({ message: 'This vehicle already has an active parking entry' });

    const parking = await Parking.findById(req.params.parkingId).select('dailyParkingRate').lean();
    if (!parking) return res.status(404).json({ message: 'Parking not found' });
    const record = await DailyParkingRecord.create({
      parkingId: req.params.parkingId,
      vehicleNumber: normalizedNumber,
      vehicleType,
      customerName,
      customerPhone,
      notes,
      fee: parking.dailyParkingRate,
    });
    return res.status(201).json({ record });
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
  const { method } = req.body;
  if (!validMethods.includes(method)) {
    return res.status(400).json({ message: 'Payment method must be cash, easypaisa, or jazzcash' });
  }
  try {
    const record = await DailyParkingRecord.findOneAndUpdate(
      { _id: req.params.recordId, parkingId: req.params.parkingId, paymentStatus: 'unpaid' },
      { $set: { paymentStatus: 'paid', paymentMethod: method, receivedBy: req.user.id } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    if (!record) return res.status(404).json({ message: 'Unpaid daily parking record not found' });
    return res.json({ record });
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Daily parking payment update failed:', error);
    return res.status(500).json({ message: 'Could not record daily parking payment' });
  }
};

module.exports = {
  getDailyRate,
  updateDailyRate,
  createEntry,
  listRecords,
  listActiveRecords,
  recordExit,
  recordPayment,
};
