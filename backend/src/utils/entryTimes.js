const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const MAX_BACKDATE_MONTHS = 24;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
// A calendar date plus an optional time. Deliberately strict so `new Date()`
// leniency (which happily reads "12" or "March 3") cannot sneak through.
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?([Zz]|[+-]\d{2}:?\d{2})?$/;

const INVALID_MESSAGE = {
  entryDateTime: 'entryDateTime must be a valid date (ISO 8601 or YYYY-MM-DD)',
  exitDateTime: 'exitDateTime must be a valid date (ISO 8601 or YYYY-MM-DD)',
};

/**
 * Parses one submitted date. `YYYY-MM-DD` is treated as local midnight, an ISO
 * date-time without an offset is local time, and anything else must look like
 * an ISO date-time. Returns null when the value is not a real calendar date.
 */
const parseDateValue = (value) => {
  // A Date instance can only come from our own code (JSON bodies always carry
  // strings), so accept it directly for convenience.
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = DATE_ONLY.exec(trimmed);
  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(year, month - 1, day);
    // Rejects rollovers such as 2026-02-30 becoming March 2.
    if (
      date.getFullYear() !== year
      || date.getMonth() !== month - 1
      || date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  if (!ISO_DATE_TIME.test(trimmed)) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthsBefore = (time, months) => {
  const date = new Date(time);
  date.setMonth(date.getMonth() - months);
  return date.getTime();
};

const isProvided = (source, key) => {
  if (!Object.prototype.hasOwnProperty.call(source, key)) return false;
  const value = source[key];
  if (value === undefined || value === null) return false;
  return !(typeof value === 'string' && !value.trim());
};

/**
 * Validates the optional `entryDateTime` / `exitDateTime` fields of a
 * daily-parking entry body.
 *
 * Returns `{ entryDateTime, exitDateTime }` where an absent field is `null`
 * (the model then applies its own default). Throws an Error with a
 * user-facing message for invalid, future, or too-old values.
 */
const parseEntryTimes = (body = {}, now = new Date()) => {
  const source = body && typeof body === 'object' ? body : {};
  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (Number.isNaN(nowTime)) throw new Error('now must be a valid date');

  const result = { entryDateTime: null, exitDateTime: null };

  if (isProvided(source, 'entryDateTime')) {
    const entry = parseDateValue(source.entryDateTime);
    if (!entry) throw new Error(INVALID_MESSAGE.entryDateTime);
    if (entry.getTime() > nowTime + FUTURE_TOLERANCE_MS) {
      throw new Error('Entry date cannot be in the future');
    }
    if (entry.getTime() < monthsBefore(nowTime, MAX_BACKDATE_MONTHS)) {
      throw new Error('Entry date is too far in the past');
    }
    result.entryDateTime = entry;
  }

  if (isProvided(source, 'exitDateTime')) {
    const exit = parseDateValue(source.exitDateTime);
    if (!exit) throw new Error(INVALID_MESSAGE.exitDateTime);
    const entryTime = result.entryDateTime ? result.entryDateTime.getTime() : nowTime;
    if (exit.getTime() <= entryTime) {
      throw new Error('Exit date must be after the entry date');
    }
    if (exit.getTime() > nowTime + FUTURE_TOLERANCE_MS) {
      throw new Error('Exit date cannot be in the future');
    }
    result.exitDateTime = exit;
  }

  return result;
};

module.exports = {
  FUTURE_TOLERANCE_MS,
  MAX_BACKDATE_MONTHS,
  parseDateValue,
  parseEntryTimes,
};
