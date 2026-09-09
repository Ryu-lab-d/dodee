const { Attendance } = require('../models');

// The server container has no guaranteed local timezone (Railway defaults to UTC), but the
// business runs on Thailand wall-clock time (UTC+7, no DST) - so every work-hour computation
// here works from an explicit +7h shift instead of the server process's local time methods.
const THAI_OFFSET_MIN = 7 * 60;

const WORK_START_MIN = 8 * 60; // 08:00 - check-in window opens
const LATE_AFTER_MIN = 9 * 60; // 09:00 - after this, check-in is recorded as late
const WORK_END_MIN = 17 * 60; // 17:00 - normal check-out time

// Shifts a UTC instant by +7h and reads it back with the UTC getters, which yields Thai
// local wall-clock values regardless of what timezone the Node process itself is in.
const toThaiParts = (date = new Date()) => {
  const shifted = new Date(date.getTime() + THAI_OFFSET_MIN * 60 * 1000);
  const minutesOfDay = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return {
    dateStr: shifted.toISOString().slice(0, 10), // Thai calendar day, YYYY-MM-DD
    minutesOfDay,
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
};

const formatHHMM = (minutesOfDay) => {
  const h = String(Math.floor(minutesOfDay / 60)).padStart(2, '0');
  const m = String(minutesOfDay % 60).padStart(2, '0');
  return `${h}:${m}`;
};

const isBeforeCheckInWindow = (date = new Date()) => toThaiParts(date).minutesOfDay < WORK_START_MIN;
const computeLateMinutes = (date = new Date()) => Math.max(0, toThaiParts(date).minutesOfDay - LATE_AFTER_MIN);
const computeEarlyMinutes = (date = new Date()) => Math.max(0, WORK_END_MIN - toThaiParts(date).minutesOfDay);
const isPastWorkEnd = (date = new Date()) => toThaiParts(date).minutesOfDay >= WORK_END_MIN;

const getTodayRecord = (userId, date = new Date()) =>
  Attendance.findOne({ where: { userId, date: toThaiParts(date).dateStr } });

// Owner always has access. Everyone else needs an open (checked-in, not-yet-checked-out)
// attendance record for today's Thai calendar date.
const hasAccessToday = async (user, date = new Date()) => {
  if (user.role === 'owner') return true;
  const record = await getTodayRecord(user.id, date);
  return !!record && !!record.checkInAt && !record.checkOutAt;
};

module.exports = {
  THAI_OFFSET_MIN,
  WORK_START_MIN,
  LATE_AFTER_MIN,
  WORK_END_MIN,
  toThaiParts,
  formatHHMM,
  isBeforeCheckInWindow,
  computeLateMinutes,
  computeEarlyMinutes,
  isPastWorkEnd,
  getTodayRecord,
  hasAccessToday,
};
