const mongoose = require('mongoose');

const dailyParkingRecordSchema = new mongoose.Schema(
  {
    parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', required: true },
    vehicleNumber: { type: String, required: true, trim: true, uppercase: true },
    vehicleType: { type: String, trim: true, default: '' },
    customerName: { type: String, trim: true, default: '' },
    customerPhone: { type: String, trim: true, default: '' },
    entryDateTime: { type: Date, required: true, default: Date.now },
    exitDateTime: { type: Date },
    fee: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    paymentMethod: { type: String, enum: ['cash', 'easypaisa', 'jazzcash'] },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

dailyParkingRecordSchema.index({ parkingId: 1, entryDateTime: -1 });
dailyParkingRecordSchema.index({ parkingId: 1, vehicleNumber: 1, exitDateTime: 1 });

module.exports = mongoose.model('DailyParkingRecord', dailyParkingRecordSchema);
