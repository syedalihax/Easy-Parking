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
    // Default daily fee, used for vehicle types missing from the rate card.
    dailyParkingRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Per-vehicle-type daily rate card. Entries snapshot their fee onto each
    // DailyParkingRecord, so editing the card never rewrites past entries.
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
