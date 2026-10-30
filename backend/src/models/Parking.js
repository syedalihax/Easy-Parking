const mongoose = require('mongoose');

const parkingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: '',
    },
    contactInfo: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: 'PKR',
    },
    timezone: {
      type: String,
      default: 'Asia/Karachi',
    },
    defaultLanguage: {
      type: String,
      enum: ['en', 'fa-IR', 'ur', 'ur-Latn'],
      default: 'en',
    },
    dailyParkingRate: {
      type: Number,
      default: 0,
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

module.exports = mongoose.model('Parking', parkingSchema);
