const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parkingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parking',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'manager'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'removed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  },
);

membershipSchema.index(
  { userId: 1, parkingId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

module.exports = mongoose.model('Membership', membershipSchema);
