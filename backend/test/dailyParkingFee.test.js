const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDailyParkingFee } = require('../src/controllers/dailyParkingController');

test('daily parking fee accepts valid numeric values for each vehicle entry', () => {
  assert.equal(parseDailyParkingFee(300), 300);
  assert.equal(parseDailyParkingFee('450.5'), 450.5);
});

test('daily parking fee rejects invalid values', () => {
  assert.throws(() => parseDailyParkingFee('abc'), /daily fee/i);
  assert.throws(() => parseDailyParkingFee(-1), /daily fee/i);
});
