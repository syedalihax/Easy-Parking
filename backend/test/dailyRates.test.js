const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_RATE_CARD_TYPES,
  normalizeVehicleType,
  resolveDailyRate,
  validateRateCard,
} = require('../src/utils/dailyRates');

const card = [
  { vehicleType: 'Rickshaw', rate: 50 },
  { vehicleType: 'Motorcycle', rate: 40 },
  { vehicleType: 'Car', rate: 100 },
  { vehicleType: 'Water Tanker', rate: 300 },
  { vehicleType: 'Tractor', rate: 400 },
];

test('resolveDailyRate prices each vehicle type from the card', () => {
  assert.equal(resolveDailyRate({ vehicleType: 'Rickshaw', rates: card, defaultRate: 60 }).rate, 50);
  assert.equal(resolveDailyRate({ vehicleType: 'Motorcycle', rates: card, defaultRate: 60 }).rate, 40);
  assert.equal(resolveDailyRate({ vehicleType: 'Car', rates: card, defaultRate: 60 }).rate, 100);
  assert.equal(resolveDailyRate({ vehicleType: 'Water Tanker', rates: card, defaultRate: 60 }).rate, 300);
  assert.equal(resolveDailyRate({ vehicleType: 'Tractor', rates: card, defaultRate: 60 }).rate, 400);
});

test('vehicle types match case-insensitively and ignore surrounding/repeated whitespace', () => {
  const variants = ['car', 'CAR', '  Car  ', 'cAr', 'water   tanker', ' WATER TANKER '];
  assert.equal(resolveDailyRate({ vehicleType: variants[0], rates: card, defaultRate: 60 }).rate, 100);
  assert.equal(resolveDailyRate({ vehicleType: variants[1], rates: card, defaultRate: 60 }).rate, 100);
  assert.equal(resolveDailyRate({ vehicleType: variants[2], rates: card, defaultRate: 60 }).rate, 100);
  assert.equal(resolveDailyRate({ vehicleType: variants[3], rates: card, defaultRate: 60 }).rate, 100);
  assert.equal(resolveDailyRate({ vehicleType: variants[4], rates: card, defaultRate: 60 }).rate, 300);
  assert.equal(resolveDailyRate({ vehicleType: variants[5], rates: card, defaultRate: 60 }).rate, 300);
});

test('the record stores the rate card spelling of the type that was priced', () => {
  const pricing = resolveDailyRate({ vehicleType: '  water tanker ', rates: card, defaultRate: 60 });
  assert.deepEqual(pricing, { rate: 300, vehicleType: 'Water Tanker', matched: true });
});

test('a zero rate on the card is a real price, not a missing one', () => {
  const freeBikes = [{ vehicleType: 'motorcycle', rate: 0 }];
  const pricing = resolveDailyRate({ vehicleType: 'Motorcycle', rates: freeBikes, defaultRate: 60 });
  assert.equal(pricing.rate, 0);
  assert.equal(pricing.matched, true);
});

test('unknown and blank vehicle types fall back to the default rate', () => {
  const unknown = resolveDailyRate({ vehicleType: 'Truck', rates: card, defaultRate: 60 });
  assert.deepEqual(unknown, { rate: 60, vehicleType: 'Truck', matched: false });

  const blank = resolveDailyRate({ vehicleType: '', rates: card, defaultRate: 60 });
  assert.deepEqual(blank, { rate: 60, vehicleType: '', matched: false });

  const missing = resolveDailyRate({ rates: card, defaultRate: 60 });
  assert.deepEqual(missing, { rate: 60, vehicleType: '', matched: false });
});

test('a parking with no card prices everything at its default rate', () => {
  assert.equal(resolveDailyRate({ vehicleType: 'Car', rates: [], defaultRate: 25 }).rate, 25);
  assert.equal(resolveDailyRate({ vehicleType: 'Car', rates: undefined, defaultRate: 25 }).rate, 25);
  assert.equal(resolveDailyRate({ vehicleType: 'Car', defaultRate: 25 }).rate, 25);
});

test('a default of zero is preserved for unknown types', () => {
  const pricing = resolveDailyRate({ vehicleType: 'Truck', rates: card, defaultRate: 0 });
  assert.equal(pricing.rate, 0);
  assert.equal(pricing.matched, false);
});

test('malformed stored rates are ignored instead of producing NaN or negative fees', () => {
  const broken = [
    { vehicleType: 'Car', rate: -5 },
    { vehicleType: 'Van', rate: '90' },
    { vehicleType: 'Bus', rate: Number.NaN },
    { vehicleType: 'Truck', rate: Infinity },
  ];
  for (const entry of broken) {
    const pricing = resolveDailyRate({ vehicleType: entry.vehicleType, rates: broken, defaultRate: 60 });
    assert.equal(pricing.rate, 60, `expected the default rate for ${entry.vehicleType}`);
    assert.equal(pricing.matched, false);
  }
  assert.equal(resolveDailyRate({ vehicleType: 'Truck', rates: broken, defaultRate: undefined }).rate, 0);
});

test('normalizeVehicleType collapses case and whitespace but ignores non-strings', () => {
  assert.equal(normalizeVehicleType('  Water   Tanker '), 'water tanker');
  assert.equal(normalizeVehicleType('CAR'), 'car');
  assert.equal(normalizeVehicleType('   '), '');
  assert.equal(normalizeVehicleType(null), '');
  assert.equal(normalizeVehicleType(42), '');
});

test('validateRateCard trims names and keeps rates verbatim', () => {
  const normalized = validateRateCard([
    { vehicleType: ' Rickshaw ', rate: 50 },
    { vehicleType: 'Car', rate: 250 },
  ]);
  assert.deepEqual(normalized, [
    { vehicleType: 'Rickshaw', rate: 50 },
    { vehicleType: 'Car', rate: 250 },
  ]);
});

test('validateRateCard accepts an empty card and exactly the maximum number of types', () => {
  assert.deepEqual(validateRateCard([]), []);

  const full = Array.from({ length: MAX_RATE_CARD_TYPES }, (_, index) => ({
    vehicleType: `Type ${index}`,
    rate: index + 1,
  }));
  assert.equal(validateRateCard(full).length, MAX_RATE_CARD_TYPES);

  assert.throws(
    () => validateRateCard([...full, { vehicleType: 'One Too Many', rate: 1 }]),
    /more than 12 vehicle types/,
  );
});

test('validateRateCard rejects non-arrays, malformed entries, and bad rates', () => {
  assert.throws(() => validateRateCard(undefined), /must be an array/);
  assert.throws(() => validateRateCard('car'), /must be an array/);
  assert.throws(() => validateRateCard([null]), /must be an object/);
  assert.throws(() => validateRateCard(['Car']), /must be an object/);
  assert.throws(() => validateRateCard([{ rate: 50 }]), /vehicleType is required/);
  assert.throws(() => validateRateCard([{ vehicleType: '   ', rate: 50 }]), /vehicleType is required/);
  assert.throws(() => validateRateCard([{ vehicleType: 'Car' }]), /Rate is required for Car/);
  assert.throws(() => validateRateCard([{ vehicleType: 'Car', rate: null }]), /Rate is required for Car/);
  assert.throws(() => validateRateCard([{ vehicleType: 'Car', rate: '' }]), /Rate is required for Car/);
  assert.throws(() => validateRateCard([{ vehicleType: 'Motorcycle', rate: 0 }]), /Rate must be greater than zero for Motorcycle/);
  assert.throws(() => validateRateCard([{ vehicleType: 'Car', rate: -1 }]), /greater than zero for Car/);
  assert.throws(() => validateRateCard([{ vehicleType: 'Car', rate: Number.NaN }]), /greater than zero for Car/);
  assert.throws(() => validateRateCard([{ vehicleType: 'Car', rate: Infinity }]), /greater than zero for Car/);
  assert.throws(() => validateRateCard([{ vehicleType: 'Car', rate: '100' }]), /greater than zero for Car/);
  assert.throws(
    () => validateRateCard([{ vehicleType: 'x'.repeat(41), rate: 10 }]),
    /cannot exceed 40 characters/,
  );
});

test('validateRateCard names the offending row when a rate is missing or zero', () => {
  const card = [
    { vehicleType: 'Rickshaw', rate: 50 },
    { vehicleType: 'Water Tanker', rate: 0 },
  ];
  assert.throws(() => validateRateCard(card), /Rate must be greater than zero for Water Tanker/);
  assert.throws(
    () => validateRateCard([{ vehicleType: 'Car' }, { vehicleType: 'Motorcycle' }]),
    /Rate is required for Car/,
  );
});

test('validateRateCard rejects duplicate vehicle types regardless of case or spacing', () => {
  assert.throws(
    () => validateRateCard([
      { vehicleType: 'Car', rate: 100 },
      { vehicleType: ' car ', rate: 120 },
    ]),
    /Duplicate vehicle type/,
  );
  assert.throws(
    () => validateRateCard([
      { vehicleType: 'Water Tanker', rate: 300 },
      { vehicleType: 'water   tanker', rate: 350 },
    ]),
    /Duplicate vehicle type/,
  );
  assert.doesNotThrow(() => validateRateCard([
    { vehicleType: 'Car', rate: 100 },
    { vehicleType: 'Car Wash Van', rate: 120 },
  ]));
});
