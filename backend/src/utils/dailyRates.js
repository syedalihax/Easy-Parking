const MAX_RATE_CARD_TYPES = 12;
const MAX_VEHICLE_TYPE_LENGTH = 40;

/**
 * Vehicle types are matched case-insensitively and ignoring surrounding or
 * repeated whitespace, so " Water  Tanker " and "water tanker" are the same key.
 */
const normalizeVehicleType = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

const isNonNegativeMoney = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isPositiveMoney = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Validates and normalizes a rate card. Throws an Error with a user-facing
 * message when the card is unusable, otherwise returns a clean array of
 * `{ vehicleType, rate }` with trimmed display names and de-duplicated keys.
 *
 * Every row must name a vehicle type and carry a price greater than zero: a
 * rate card is what the operator charges, so a blank or zero row is an
 * unfinished card rather than a free type.
 */
const validateRateCard = (rates) => {
  if (!Array.isArray(rates)) {
    throw new Error('rates must be an array of { vehicleType, rate }');
  }
  if (rates.length > MAX_RATE_CARD_TYPES) {
    throw new Error(`rates cannot contain more than ${MAX_RATE_CARD_TYPES} vehicle types`);
  }

  const seen = new Set();
  const normalized = [];
  rates.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`rates[${index}] must be an object with vehicleType and rate`);
    }
    const vehicleType = typeof entry.vehicleType === 'string' ? entry.vehicleType.trim() : '';
    if (!vehicleType) {
      throw new Error(`rates[${index}].vehicleType is required`);
    }
    if (vehicleType.length > MAX_VEHICLE_TYPE_LENGTH) {
      throw new Error(`rates[${index}].vehicleType cannot exceed ${MAX_VEHICLE_TYPE_LENGTH} characters`);
    }
    const { rate } = entry;
    if (rate === undefined || rate === null || rate === '') {
      throw new Error(`Rate is required for ${vehicleType}`);
    }
    if (!isPositiveMoney(rate)) {
      throw new Error(`Rate must be greater than zero for ${vehicleType}`);
    }

    const key = normalizeVehicleType(vehicleType);
    if (seen.has(key)) {
      throw new Error(`Duplicate vehicle type in rates: ${vehicleType}`);
    }
    seen.add(key);
    normalized.push({ vehicleType, rate: entry.rate });
  });

  return normalized;
};

/**
 * Resolves the fee for one entry. Unmatched or blank vehicle types fall back to
 * the parking's default daily rate. The matched card entry's display name is
 * returned so the record stores the rate card's own casing, not the operator's.
 *
 * Malformed stored data (non-finite or negative rates) is treated as absent so
 * a bad rate can never produce a negative or NaN fee.
 */
const resolveDailyRate = ({ vehicleType = '', rates = [], defaultRate = 0 } = {}) => {
  const requested = normalizeVehicleType(vehicleType);
  const card = Array.isArray(rates) ? rates : [];

  if (requested) {
    const match = card.find((entry) => normalizeVehicleType(entry?.vehicleType) === requested);
    if (match && isNonNegativeMoney(match.rate)) {
      return { rate: match.rate, vehicleType: String(match.vehicleType).trim(), matched: true };
    }
  }

  return {
    rate: isNonNegativeMoney(defaultRate) ? defaultRate : 0,
    vehicleType: typeof vehicleType === 'string' ? vehicleType.trim() : '',
    matched: false,
  };
};

module.exports = {
  MAX_RATE_CARD_TYPES,
  MAX_VEHICLE_TYPE_LENGTH,
  isNonNegativeMoney,
  isPositiveMoney,
  normalizeVehicleType,
  resolveDailyRate,
  validateRateCard,
};
