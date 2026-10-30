const mongoose = require('mongoose');

const parkingSubscriptionSchema = new mongoose.Schema(
  {
    parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    monthlyRate: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endedAt: Date,
    billingCycleDay: { type: Number, required: true, min: 1, max: 31 },
    status: { type: String, enum: ['active', 'paused', 'ended'], default: 'active' },
    pendingRateChange: {
      newRate: { type: Number, min: 0 },
      effectiveFrom: Date,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

parkingSubscriptionSchema.index({ parkingId: 1, vehicleId: 1, status: 1 });
parkingSubscriptionSchema.index(
  { parkingId: 1, vehicleId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

module.exports = mongoose.model('ParkingSubscription', parkingSubscriptionSchema);
