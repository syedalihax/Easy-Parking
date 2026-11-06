const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', required: true },
    // One ledger for every rupee received: monthly subscription bills and walk-in parking.
    source: { type: String, enum: ['monthly', 'daily'], default: 'monthly' },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: function requiredForMonthly() {
        return this.source !== 'daily';
      },
    },
    dailyRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyParkingRecord',
      required: function requiredForDaily() {
        return this.source === 'daily';
      },
    },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    method: { type: String, enum: ['cash', 'easypaisa', 'jazzcash'], required: true },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referenceNumber: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'reversed'], default: 'active' },
  },
  { timestamps: true },
);

paymentSchema.index({ parkingId: 1, customerId: 1 });
paymentSchema.index({ parkingId: 1, paymentDate: -1 });
paymentSchema.index({ dailyRecordId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);
