const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    parkingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parking',
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emailOrPhone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'manager'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  },
);

invitationSchema.index({ emailOrPhone: 1 });
invitationSchema.index({ parkingId: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
