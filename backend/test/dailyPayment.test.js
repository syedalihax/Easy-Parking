const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Payment = require('../src/models/Payment');

const objectId = () => new mongoose.Types.ObjectId();

const buildPayment = (overrides = {}) => new Payment({
  parkingId: objectId(),
  amount: 50,
  method: 'cash',
  receivedBy: objectId(),
  ...overrides,
});

test('monthly payments still require a customer', () => {
  const error = buildPayment({ source: 'monthly' }).validateSync();
  assert.ok(error, 'expected a validation error');
  assert.ok(error.errors.customerId, 'customerId must be required for monthly payments');
});

test('daily payments require the parking record they settle', () => {
  const error = buildPayment({ source: 'daily' }).validateSync();
  assert.ok(error, 'expected a validation error');
  assert.ok(error.errors.dailyRecordId, 'dailyRecordId must be required for daily payments');
});

test('daily payments do not require a customer', () => {
  const payment = buildPayment({ source: 'daily', dailyRecordId: objectId() });
  assert.equal(payment.validateSync(), undefined);
});

test('source defaults to monthly so existing writes keep working', () => {
  const payment = buildPayment({ customerId: objectId() });
  assert.equal(payment.source, 'monthly');
  assert.equal(payment.validateSync(), undefined);
});

test('a daily payment may only settle one record (unique dailyRecordId index)', () => {
  const indexes = Payment.schema.indexes();
  const dailyIndex = indexes.find(([fields]) => fields.dailyRecordId === 1);
  assert.ok(dailyIndex, 'expected an index on dailyRecordId');
  assert.equal(dailyIndex[1].unique, true);
  assert.equal(dailyIndex[1].sparse, true);
});

test('amount cannot be negative', () => {
  const error = buildPayment({ source: 'daily', dailyRecordId: objectId(), amount: -1 }).validateSync();
  assert.ok(error?.errors.amount, 'negative amounts must be rejected');
});
