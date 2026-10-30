const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    parkingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parking',
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    primaryPhone: {
      type: String,
      required: true,
      trim: true,
    },
    secondaryPhone: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  },
);

customerSchema.index({ parkingId: 1 });
customerSchema.index({ fullName: 'text' });
customerSchema.index({ primaryPhone: 1 });

module.exports = mongoose.model('Customer', customerSchema);
