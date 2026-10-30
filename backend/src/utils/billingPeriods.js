const {
  addDays,
  addMonths,
  differenceInCalendarMonths,
  isAfter,
  isBefore,
  startOfDay,
} = require('date-fns');
const { UTCDate } = require('@date-fns/utc');

const asUTCDate = (value) => new UTCDate(new Date(value).getTime());

const periodAt = (anchorDate, index) => {
  const start = startOfDay(addMonths(anchorDate, index));
  const nextStart = startOfDay(addMonths(anchorDate, index + 1));
  return {
    start,
    end: addDays(nextStart, -1),
    nextStart,
  };
};

const getBillingPeriod = (anchorDate, referenceDate = new Date()) => {
  const anchor = startOfDay(asUTCDate(anchorDate));
  const reference = startOfDay(asUTCDate(referenceDate));
  if (Number.isNaN(anchor.getTime()) || Number.isNaN(reference.getTime())) {
    throw new Error('Billing anchor and reference date must be valid');
  }

  let index = Math.max(0, differenceInCalendarMonths(reference, anchor));
  while (index > 0 && isAfter(periodAt(anchor, index).start, reference)) index -= 1;
  while (isBefore(periodAt(anchor, index).nextStart, reference) || periodAt(anchor, index).nextStart.getTime() === reference.getTime()) {
    index += 1;
  }

  return periodAt(anchor, index);
};

const getCompletedBillingPeriods = (anchorDate, afterDate, throughDate = new Date()) => {
  const anchor = startOfDay(asUTCDate(anchorDate));
  const through = startOfDay(asUTCDate(throughDate));
  if (Number.isNaN(anchor.getTime()) || Number.isNaN(through.getTime())) {
    throw new Error('Billing anchor and reference date must be valid');
  }

  const firstAllowedStart = afterDate ? addDays(startOfDay(asUTCDate(afterDate)), 1) : anchor;
  let index = Math.max(0, differenceInCalendarMonths(firstAllowedStart, anchor));
  while (index > 0 && isAfter(periodAt(anchor, index).start, firstAllowedStart)) index -= 1;
  while (isBefore(periodAt(anchor, index).start, firstAllowedStart)) index += 1;

  const periods = [];
  for (let count = 0; count < 1200; count += 1, index += 1) {
    const period = periodAt(anchor, index);
    if (!isBefore(period.nextStart, through) && period.nextStart.getTime() !== through.getTime()) break;
    periods.push({ start: period.start, end: period.end });
  }

  return periods;
};

const getFinalBillingPeriod = (anchorDate, endedAt) => {
  const endDate = startOfDay(asUTCDate(endedAt));
  const containingPeriod = getBillingPeriod(anchorDate, endDate);
  return containingPeriod.start.getTime() === endDate.getTime()
    ? getBillingPeriod(anchorDate, addDays(endDate, -1))
    : containingPeriod;
};

module.exports = { getBillingPeriod, getCompletedBillingPeriods, getFinalBillingPeriod };
