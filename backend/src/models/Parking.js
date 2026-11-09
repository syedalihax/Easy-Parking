const mongoose = require('mongoose');
const {
  MAX_RATE_CARD_TYPES,
  MAX_VEHICLE_TYPE_LENGTH,
  normalizeVehicleType,
} = require('../utils/dailyRates');

const dailyRateSchema = new mongoose.Schema(
  {
    vehicleType: {
      type: String,
      required: true,
      trim: true,
      maxlength: MAX_VEHICLE_TYPE_LENGTH,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

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
      min: 0,
    },
    dailyRates: {
      type: [dailyRateSchema],
      default: [],
      validate: [
        {
          validator: (rates) => rates.length <= MAX_RATE_CARD_TYPES,
          message: `A rate card cannot contain more than ${MAX_RATE_CARD_TYPES} vehicle types`,
        },
        {
          validator: (rates) => new Set(rates.map(({ vehicleType }) => normalizeVehicleType(vehicleType))).size
            === rates.length,
          message: 'A rate card cannot contain duplicate vehicle types',
        },
      ],
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
