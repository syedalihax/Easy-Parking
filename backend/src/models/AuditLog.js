const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    parkingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parking', required: true },
    actionType: {
      type: String,
      enum: ['payment_correction', 'manual_due_adjustment', 'membership_change'],
      required: true,
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    targetCollection: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, trim: true },
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

auditLogSchema.index({ parkingId: 1, targetCollection: 1, targetId: 1 });
auditLogSchema.index(
  { parkingId: 1, targetId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      actionType: 'payment_correction',
      'newValue.approvalStatus': 'pending',
    },
  },
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
