const test = require('node:test');
const assert = require('node:assert/strict');
const Parking = require('../src/models/Parking');
const DailyParkingRecord = require('../src/models/DailyParkingRecord');
const {
  createEntry,
  getDailyRate,
  replaceRateCard,
  updateDailyRate,
} = require('../src/controllers/dailyParkingController');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const stubFindById = (parking) => {
  const original = Parking.findById;
  Parking.findById = () => ({ select: () => ({ lean: async () => parking }) });
  return () => { Parking.findById = original; };
};

const stubFindByIdAndUpdate = (parking) => {
  const original = Parking.findByIdAndUpdate;
  let captured;
  Parking.findByIdAndUpdate = (id, update, options) => {
    captured = { id, update, options };
    // Mimic `returnDocument: 'after'` by applying the $set to the stored doc.
    const result = { ...parking, ...(update.$set || {}) };
    return { select: () => ({ lean: async () => result }) };
  };
  return { restore: () => { Parking.findByIdAndUpdate = original; }, captured: () => captured };
};

const rateCard = [
  { vehicleType: 'Rickshaw', rate: 50 },
  { vehicleType: 'Motorcycle', rate: 40 },
  { vehicleType: 'Car', rate: 100 },
  { vehicleType: 'Water Tanker', rate: 300 },
  { vehicleType: 'Tractor', rate: 400 },
];

test('Parking defaults to an empty rate card and keeps the legacy default rate', () => {
  const parking = new Parking({ name: 'Main Plaza' });
  assert.deepEqual(parking.dailyRates, []);
  assert.equal(parking.dailyParkingRate, 0);
  assert.equal(parking.validateSync(), undefined);
});

test('Parking schema caps the rate card at 12 vehicle types', () => {
  const build = (count) => new Parking({
    name: 'Main Plaza',
    dailyRates: Array.from({ length: count }, (_, index) => ({ vehicleType: `Type ${index}`, rate: index })),
  });
  assert.equal(build(12).validateSync(), undefined);
  assert.ok(build(13).validateSync()?.errors.dailyRates);
});

test('Parking schema rejects duplicate vehicle types case-insensitively', () => {
  const parking = new Parking({
    name: 'Main Plaza',
    dailyRates: [
      { vehicleType: 'Car', rate: 100 },
      { vehicleType: ' car ', rate: 150 },
    ],
  });
  assert.ok(parking.validateSync()?.errors.dailyRates);
});

test('Parking schema rejects negative rates', () => {
  const parking = new Parking({
    name: 'Main Plaza',
    dailyRates: [{ vehicleType: 'Car', rate: -1 }],
  });
  assert.ok(parking.validateSync()?.errors['dailyRates.0.rate']);
});

test('GET daily-rate returns the card alongside the legacy default rate', async () => {
  const restore = stubFindById({ dailyParkingRate: 60, dailyRates: rateCard });
  try {
    const response = createResponse();
    await getDailyRate({ params: { parkingId: 'parking-1' } }, response);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { dailyParkingRate: 60, rates: rateCard });
  } finally {
    restore();
  }
});

test('PATCH daily-rate still accepts the legacy { dailyParkingRate } body', async () => {
  const stub = stubFindByIdAndUpdate({ dailyParkingRate: 75, dailyRates: [] });
  try {
    const response = createResponse();
    await updateDailyRate(
      { params: { parkingId: 'parking-1' }, body: { dailyParkingRate: 75 } },
      response,
    );
    assert.equal(response.statusCode, 200);
    assert.deepEqual(stub.captured().update, { $set: { dailyParkingRate: 75 } });
    assert.deepEqual(response.body, { dailyParkingRate: 75, rates: [] });
  } finally {
    stub.restore();
  }
});

test('PATCH daily-rate accepts an optional rates array', async () => {
  const stub = stubFindByIdAndUpdate({ dailyParkingRate: 60, dailyRates: rateCard });
  try {
    const response = createResponse();
    await updateDailyRate(
      {
        params: { parkingId: 'parking-1' },
        body: { dailyParkingRate: 60, rates: [{ vehicleType: ' Car ', rate: 120 }] },
      },
      response,
    );
    assert.equal(response.statusCode, 200);
    assert.deepEqual(stub.captured().update, {
      $set: { dailyParkingRate: 60, dailyRates: [{ vehicleType: 'Car', rate: 120 }] },
    });
    assert.deepEqual(response.body, {
      dailyParkingRate: 60,
      rates: [{ vehicleType: 'Car', rate: 120 }],
    });
  } finally {
    stub.restore();
  }
});

test('PATCH daily-rate rejects invalid or empty bodies without touching the parking', async () => {
  const stub = stubFindByIdAndUpdate({ dailyParkingRate: 60, dailyRates: [] });
  try {
    const invalidRate = createResponse();
    await updateDailyRate(
      { params: { parkingId: 'parking-1' }, body: { dailyParkingRate: -1 } },
      invalidRate,
    );
    assert.equal(invalidRate.statusCode, 400);

    const duplicate = createResponse();
    await updateDailyRate(
      {
        params: { parkingId: 'parking-1' },
        body: { rates: [{ vehicleType: 'Car', rate: 1 }, { vehicleType: 'car', rate: 2 }] },
      },
      duplicate,
    );
    assert.equal(duplicate.statusCode, 400);
    assert.match(duplicate.body.message, /Duplicate vehicle type/);

    const empty = createResponse();
    await updateDailyRate({ params: { parkingId: 'parking-1' }, body: {} }, empty);
    assert.equal(empty.statusCode, 400);
    assert.equal(stub.captured(), undefined, 'no write should happen for invalid input');
  } finally {
    stub.restore();
  }
});

test('PUT daily-rate/card replaces the whole card and can optionally set the default', async () => {
  const stub = stubFindByIdAndUpdate({ dailyParkingRate: 55, dailyRates: rateCard });
  try {
    const response = createResponse();
    await replaceRateCard(
      { params: { parkingId: 'parking-1' }, body: { dailyParkingRate: 55, rates: rateCard } },
      response,
    );
    assert.equal(response.statusCode, 200);
    assert.deepEqual(stub.captured().update, { $set: { dailyParkingRate: 55, dailyRates: rateCard } });

    const clearing = createResponse();
    await replaceRateCard(
      { params: { parkingId: 'parking-1' }, body: { rates: [] } },
      clearing,
    );
    assert.deepEqual(stub.captured().update, { $set: { dailyRates: [] } });
  } finally {
    stub.restore();
  }
});

test('PUT daily-rate/card requires rates and enforces the cap', async () => {
  const missing = createResponse();
  await replaceRateCard({ params: { parkingId: 'parking-1' }, body: {} }, missing);
  assert.equal(missing.statusCode, 400);
  assert.match(missing.body.message, /rates is required/);

  const tooMany = createResponse();
  await replaceRateCard(
    {
      params: { parkingId: 'parking-1' },
      body: { rates: Array.from({ length: 13 }, (_, index) => ({ vehicleType: `Type ${index}`, rate: 1 })) },
    },
    tooMany,
  );
  assert.equal(tooMany.statusCode, 400);
  assert.match(tooMany.body.message, /more than 12/);
});

test('a new entry is priced from the rate card and snapshots fee plus type', async () => {
  const originalExists = DailyParkingRecord.exists;
  const originalCreate = DailyParkingRecord.create;
  DailyParkingRecord.exists = async () => null;
  let created;
  DailyParkingRecord.create = async (payload) => {
    created = payload;
    return { _id: 'record-1', ...payload };
  };
  const restoreParking = stubFindById({ dailyParkingRate: 60, dailyRates: rateCard });

  try {
    const response = createResponse();
    await createEntry(
      {
        params: { parkingId: 'parking-1' },
        body: { vehicleNumber: 'abc-123', vehicleType: 'water tanker' },
      },
      response,
    );

    assert.equal(response.statusCode, 201);
    assert.equal(created.fee, 300);
    assert.equal(created.vehicleType, 'Water Tanker');
    assert.equal(created.vehicleNumber, 'ABC-123');
    assert.deepEqual(response.body.pricing, { rate: 300, vehicleType: 'Water Tanker', matched: true });
  } finally {
    restoreParking();
    DailyParkingRecord.exists = originalExists;
    DailyParkingRecord.create = originalCreate;
  }
});

test('an entry with an unknown vehicle type falls back to the parking default rate', async () => {
  const originalExists = DailyParkingRecord.exists;
  const originalCreate = DailyParkingRecord.create;
  DailyParkingRecord.exists = async () => null;
  let created;
  DailyParkingRecord.create = async (payload) => {
    created = payload;
    return { _id: 'record-2', ...payload };
  };
  const restoreParking = stubFindById({ dailyParkingRate: 60, dailyRates: rateCard });

  try {
    const response = createResponse();
    await createEntry(
      { params: { parkingId: 'parking-1' }, body: { vehicleNumber: 'xyz-9', vehicleType: 'Truck' } },
      response,
    );

    assert.equal(response.statusCode, 201);
    assert.equal(created.fee, 60);
    assert.equal(created.vehicleType, 'Truck');
    assert.equal(response.body.pricing.matched, false);
  } finally {
    restoreParking();
    DailyParkingRecord.exists = originalExists;
    DailyParkingRecord.create = originalCreate;
  }
});
