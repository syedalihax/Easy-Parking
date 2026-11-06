const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_BACKDATE_MONTHS,
  parseEntryTimes,
} = require('../src/utils/entryTimes');
const Parking = require('../src/models/Parking');
const DailyParkingRecord = require('../src/models/DailyParkingRecord');
const { createEntry } = require('../src/controllers/dailyParkingController');

// Fixed clock so every assertion is deterministic.
const NOW = new Date(2026, 5, 15, 12, 0, 0); // 2026-06-15 12:00 local

const localMidnight = (year, month, day) => new Date(year, month - 1, day);

const future = (minutes) => new Date(NOW.getTime() + minutes * 60 * 1000);
const past = (minutes) => new Date(NOW.getTime() - minutes * 60 * 1000);

test('absent entry/exit dates stay unset so the model defaults apply', () => {
  assert.deepEqual(parseEntryTimes({}, NOW), { entryDateTime: null, exitDateTime: null });
  assert.deepEqual(parseEntryTimes({ vehicleNumber: 'ABC-1' }, NOW), {
    entryDateTime: null,
    exitDateTime: null,
  });
  // Blank form fields are treated as absent, not as an invalid date.
  assert.deepEqual(
    parseEntryTimes({ entryDateTime: '', exitDateTime: '   ' }, NOW),
    { entryDateTime: null, exitDateTime: null },
  );
});

test('a YYYY-MM-DD entry date means local midnight', () => {
  const { entryDateTime, exitDateTime } = parseEntryTimes(
    { entryDateTime: '2026-06-10', exitDateTime: '2026-06-11' },
    NOW,
  );
  assert.deepEqual(entryDateTime, localMidnight(2026, 6, 10));
  assert.equal(entryDateTime.getHours(), 0);
  assert.deepEqual(exitDateTime, localMidnight(2026, 6, 11));
});

test('an ISO date-time entry date is parsed as given', () => {
  const { entryDateTime } = parseEntryTimes({ entryDateTime: '2026-06-14T09:30:00' }, NOW);
  assert.equal(entryDateTime.getFullYear(), 2026);
  assert.equal(entryDateTime.getMonth(), 5);
  assert.equal(entryDateTime.getDate(), 14);
  assert.equal(entryDateTime.getHours(), 9);
  assert.equal(entryDateTime.getMinutes(), 30);

  const withOffset = parseEntryTimes({ entryDateTime: '2026-06-14T09:30:00Z' }, NOW).entryDateTime;
  assert.equal(withOffset.toISOString(), '2026-06-14T09:30:00.000Z');
});

test('a backdated entry is accepted', () => {
  const { entryDateTime } = parseEntryTimes({ entryDateTime: '2026-05-01' }, NOW);
  assert.deepEqual(entryDateTime, localMidnight(2026, 5, 1));

  const recent = parseEntryTimes({ entryDateTime: past(180) }, NOW).entryDateTime;
  assert.equal(recent.getTime(), past(180).getTime());
});

test('an entry more than 5 minutes in the future is rejected', () => {
  assert.throws(
    () => parseEntryTimes({ entryDateTime: future(10) }, NOW),
    /Entry date cannot be in the future/,
  );
  assert.throws(
    () => parseEntryTimes({ entryDateTime: '2026-06-16' }, NOW),
    /Entry date cannot be in the future/,
  );
  // Small clock skew between client and server stays allowed.
  assert.doesNotThrow(() => parseEntryTimes({ entryDateTime: future(2) }, NOW));
});

test('an entry older than 24 months is rejected', () => {
  const tooOld = new Date(2026, 5, 15);
  tooOld.setMonth(tooOld.getMonth() - (MAX_BACKDATE_MONTHS + 1));
  assert.throws(
    () => parseEntryTimes({ entryDateTime: tooOld.toISOString() }, NOW),
    /Entry date is too far in the past/,
  );

  const withinWindow = new Date(2026, 5, 15);
  withinWindow.setMonth(withinWindow.getMonth() - (MAX_BACKDATE_MONTHS - 1));
  assert.doesNotThrow(() => parseEntryTimes({ entryDateTime: withinWindow.toISOString() }, NOW));
});

test('invalid date values are rejected with a clear message', () => {
  for (const value of ['not-a-date', '2026-02-30', '2026-13-01', '2026-06-15T25:00', 42, {}, []]) {
    assert.throws(
      () => parseEntryTimes({ entryDateTime: value }, NOW),
      /entryDateTime must be a valid date/,
      `expected ${JSON.stringify(value)} to be rejected`,
    );
    assert.throws(
      () => parseEntryTimes({ exitDateTime: value }, NOW),
      /exitDateTime must be a valid date/,
      `expected ${JSON.stringify(value)} to be rejected as an exit date`,
    );
  }
});

test('an exit date must fall after the entry date and not be in the future', () => {
  assert.throws(
    () => parseEntryTimes({ entryDateTime: '2026-06-10', exitDateTime: '2026-06-09' }, NOW),
    /Exit date must be after the entry date/,
  );
  assert.throws(
    () => parseEntryTimes({ entryDateTime: '2026-06-10', exitDateTime: '2026-06-10' }, NOW),
    /Exit date must be after the entry date/,
  );
  assert.throws(
    () => parseEntryTimes({ entryDateTime: past(60), exitDateTime: future(30) }, NOW),
    /Exit date cannot be in the future/,
  );

  const accepted = parseEntryTimes({ entryDateTime: past(120), exitDateTime: past(5) }, NOW);
  assert.equal(accepted.exitDateTime.getTime(), past(5).getTime());
});

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

const stubParking = (parking) => {
  const original = Parking.findById;
  Parking.findById = () => ({ select: () => ({ lean: async () => parking }) });
  return () => { Parking.findById = original; };
};

const dateOnlyDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

test('createEntry stores the submitted backdated entry and exit dates', async () => {
  const originalExists = DailyParkingRecord.exists;
  const originalCreate = DailyParkingRecord.create;
  let created;
  let existsCalls = 0;
  DailyParkingRecord.exists = async () => { existsCalls += 1; return null; };
  DailyParkingRecord.create = async (payload) => { created = payload; return { _id: 'r1', ...payload }; };
  const restoreParking = stubParking({ dailyParkingRate: 60, dailyRates: [] });

  try {
    const response = createResponse();
    await createEntry(
      {
        params: { parkingId: 'p1' },
        body: { vehicleNumber: 'ab-1', entryDateTime: dateOnlyDaysAgo(10), exitDateTime: dateOnlyDaysAgo(9) },
      },
      response,
    );
    assert.equal(response.statusCode, 201);
    assert.equal(created.entryDateTime.getHours(), 0);
    assert.equal(created.exitDateTime.getHours(), 0);
    assert.deepEqual(created.entryDateTime, new Date(`${dateOnlyDaysAgo(10)}T00:00:00`));
    assert.deepEqual(created.exitDateTime, new Date(`${dateOnlyDaysAgo(9)}T00:00:00`));
    assert.equal(existsCalls, 0, 'an already-exited entry must not hit the active-entry check');
  } finally {
    restoreParking();
    DailyParkingRecord.exists = originalExists;
    DailyParkingRecord.create = originalCreate;
  }
});

test('createEntry still blocks an open entry when the vehicle is already parked', async () => {
  const originalExists = DailyParkingRecord.exists;
  DailyParkingRecord.exists = async () => ({ _id: 'active-1' });
  const restoreParking = stubParking({ dailyParkingRate: 60, dailyRates: [] });
  try {
    const response = createResponse();
    await createEntry({ params: { parkingId: 'p1' }, body: { vehicleNumber: 'ab-1' } }, response);
    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /already has an active parking entry/);
  } finally {
    restoreParking();
    DailyParkingRecord.exists = originalExists;
  }
});

test('createEntry rejects invalid dates with 400 and creates nothing', async () => {
  const originalCreate = DailyParkingRecord.create;
  let created = false;
  DailyParkingRecord.create = async () => { created = true; return {}; };
  const restoreParking = stubParking({ dailyParkingRate: 60, dailyRates: [] });
  try {
    const futureEntry = createResponse();
    const twoDaysAhead = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    await createEntry(
      { params: { parkingId: 'p1' }, body: { vehicleNumber: 'ab-2', entryDateTime: twoDaysAhead } },
      futureEntry,
    );
    assert.equal(futureEntry.statusCode, 400);
    assert.match(futureEntry.body.message, /Entry date cannot be in the future/);

    const badExit = createResponse();
    await createEntry(
      {
        params: { parkingId: 'p1' },
        body: { vehicleNumber: 'ab-2', entryDateTime: '2026-06-05', exitDateTime: '2026-06-04' },
      },
      badExit,
    );
    assert.equal(badExit.statusCode, 400);
    assert.match(badExit.body.message, /Exit date must be after the entry date/);

    assert.equal(created, false, 'no record should be written for invalid dates');
  } finally {
    restoreParking();
    DailyParkingRecord.create = originalCreate;
  }
});
