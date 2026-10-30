const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'fa-IR', 'ur', 'ur-Latn'],
      default: 'en',
    },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('validate', function validateUser(next) {
  if (!this.email && !this.phone) {
    this.invalidate('email', 'At least one of email or phone is required');
    this.invalidate('phone', 'At least one of email or phone is required');
  }

  next();
});

userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
