const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
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
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
