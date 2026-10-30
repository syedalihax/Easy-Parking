const mongoose = require('mongoose');

const monthlyDueSchema = new mongoose.Schema(
  {
    parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ParkingSubscription', required: true },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    amountDue: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    outstandingAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'partially_paid', 'paid'], default: 'pending' },
  },
  { timestamps: true },
);

monthlyDueSchema.index({ parkingId: 1, customerId: 1, status: 1 });
monthlyDueSchema.index({ subscriptionId: 1, billingPeriodStart: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyDue', monthlyDueSchema);
