const mongoose = require('mongoose');

const paymentAllocationSchema = new mongoose.Schema(
  {
    parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
    monthlyDueId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyDue', required: true },
    allocatedAmount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

paymentAllocationSchema.index({ parkingId: 1 });
paymentAllocationSchema.index({ paymentId: 1 });
paymentAllocationSchema.index({ monthlyDueId: 1 });

module.exports = mongoose.model('PaymentAllocation', paymentAllocationSchema);
