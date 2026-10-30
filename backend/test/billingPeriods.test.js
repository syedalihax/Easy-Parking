const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getBillingPeriod,
  getCompletedBillingPeriods,
  getFinalBillingPeriod,
} = require('../src/utils/billingPeriods');

const utcDate = (value) => new Date(`${value}T00:00:00.000Z`);

test('billing periods keep month-end anchors instead of drifting', () => {
  const anchor = utcDate('2024-01-31');
  const february = getBillingPeriod(anchor, utcDate('2024-02-29'));
  const march = getBillingPeriod(anchor, utcDate('2024-03-30'));
  const april = getBillingPeriod(anchor, utcDate('2024-03-31'));

  assert.equal(february.start.toISOString().slice(0, 10), '2024-02-29');
  assert.equal(february.end.toISOString().slice(0, 10), '2024-03-30');
  assert.equal(march.start.toISOString().slice(0, 10), '2024-02-29');
  assert.equal(april.start.toISOString().slice(0, 10), '2024-03-31');
});

test('completed periods begin at the anchor and stop at the current open cycle', () => {
  const periods = getCompletedBillingPeriods(
    utcDate('2024-10-15'),
    null,
    utcDate('2024-12-15'),
  );

  assert.deepEqual(periods.map(({ start, end }) => [
    start.toISOString().slice(0, 10),
    end.toISOString().slice(0, 10),
  ]), [
    ['2024-10-15', '2024-11-14'],
    ['2024-11-15', '2024-12-14'],
  ]);
});

test('completed periods continue after the most recently generated due', () => {
  const periods = getCompletedBillingPeriods(
    utcDate('2024-10-15'),
    utcDate('2024-11-14'),
    utcDate('2024-12-15'),
  );
  assert.equal(periods.length, 1);
  assert.equal(periods[0].start.toISOString().slice(0, 10), '2024-11-15');
});

test('ending at a cycle boundary closes the previous period, otherwise closes the current one', () => {
  const anchor = utcDate('2024-10-15');
  const onBoundary = getFinalBillingPeriod(anchor, utcDate('2024-11-15'));
  const midCycle = getFinalBillingPeriod(anchor, utcDate('2024-11-20'));

  assert.equal(onBoundary.start.toISOString().slice(0, 10), '2024-10-15');
  assert.equal(onBoundary.end.toISOString().slice(0, 10), '2024-11-14');
  assert.equal(midCycle.start.toISOString().slice(0, 10), '2024-11-15');
  assert.equal(midCycle.end.toISOString().slice(0, 10), '2024-12-14');
});
