const { Attendance, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');
const { OFF_HOURS_TERMS_VERSION, OFF_HOURS_TERMS_TEXT } = require('../constants/offHoursTerms');
const {
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
} = require('../utils/attendance');

const publicRecord = (record) =>
  record && {
    date: record.date,
    checkInAt: record.checkInAt,
    checkInLateMinutes: record.checkInLateMinutes,
    checkInMethod: record.checkInMethod,
    checkOutAt: record.checkOutAt,
    checkOutEarly: record.checkOutEarly,
    checkOutEarlyMinutes: record.checkOutEarlyMinutes,
  };

const status = asyncHandler(async (req, res) => {
  const now = new Date();
  const record = req.user.role === 'owner' ? null : await getTodayRecord(req.user.id, now);
  const checkedIn = !!record?.checkInAt && !record?.checkOutAt;

  res.json({
    now: now.toISOString(),
    workStart: formatHHMM(WORK_START_MIN),
    lateAfter: formatHHMM(LATE_AFTER_MIN),
    workEnd: formatHHMM(WORK_END_MIN),
    beforeWindow: isBeforeCheckInWindow(now),
    hasAccess: req.user.role === 'owner' || checkedIn,
    checkedIn,
    checkedOutToday: !!record?.checkOutAt,
    record: publicRecord(record),
  });
});

const checkIn = asyncHandler(async (req, res) => {
  const now = new Date();
  if (isBeforeCheckInWindow(now)) {
    return res.status(400).json({ message: `ยังไม่ถึงเวลาเช็คชื่อเข้างาน (เปิดเวลา ${formatHHMM(WORK_START_MIN)} น.)` });
  }

  const existing = await getTodayRecord(req.user.id, now);
  if (existing?.checkInAt && !existing.checkOutAt) {
    return res.status(409).json({ message: 'คุณเช็คชื่อเข้างานไปแล้ววันนี้' });
  }
  if (existing?.checkOutAt) {
    return res.status(409).json({ message: 'คุณเช็คชื่อออกงานไปแล้ววันนี้ กรุณาใช้ระบบขอเข้าถึงข้อมูลนอกเวลาแทน' });
  }

  const lateMinutes = computeLateMinutes(now);
  const record = await Attendance.create({
    userId: req.user.id,
    date: toThaiParts(now).dateStr,
    checkInAt: now,
    checkInLateMinutes: lateMinutes,
    checkInMethod: 'normal',
  });

  logActivity(
    req.user,
    'check_in',
    lateMinutes > 0 ? `เช็คชื่อเข้างาน (สาย ${lateMinutes} นาที)` : 'เช็คชื่อเข้างาน (ตรงเวลา)'
  );
  res.status(201).json(publicRecord(record));
});

const checkOut = asyncHandler(async (req, res) => {
  const now = new Date();
  const record = await getTodayRecord(req.user.id, now);
  if (!record?.checkInAt || record.checkOutAt) {
    return res.status(400).json({ message: 'ยังไม่ได้เช็คชื่อเข้างานวันนี้' });
  }

  if (!isPastWorkEnd(now) && !req.body.confirmEarly) {
    return res.status(409).json({
      code: 'CONFIRM_EARLY',
      message: `ตอนนี้เวลา ${formatHHMM(toThaiParts(now).minutesOfDay)} น. ยังไม่ถึงเวลาเลิกงาน (${formatHHMM(WORK_END_MIN)} น.)`,
      now: formatHHMM(toThaiParts(now).minutesOfDay),
      workEnd: formatHHMM(WORK_END_MIN),
    });
  }

  const earlyMinutes = computeEarlyMinutes(now);
  await record.update({
    checkOutAt: now,
    checkOutEarly: earlyMinutes > 0,
    checkOutEarlyMinutes: earlyMinutes,
  });

  logActivity(
    req.user,
    'check_out',
    earlyMinutes > 0 ? `เช็คชื่อออกงาน (ก่อนเวลา ${earlyMinutes} นาที)` : 'เช็คชื่อออกงาน (ตรงเวลา)'
  );
  res.json(publicRecord(record));
});

const getOffHoursAgreement = asyncHandler(async (req, res) => {
  res.json({ version: OFF_HOURS_TERMS_VERSION, text: OFF_HOURS_TERMS_TEXT });
});

const acceptOffHoursAccess = asyncHandler(async (req, res) => {
  const { reason, agreedRead, agreedComply, signatureUrl } = req.body;
  if (!reason || !reason.trim()) return res.status(400).json({ message: 'กรุณาระบุเหตุผลที่ต้องการเข้าถึงข้อมูล' });
  if (!agreedRead || !agreedComply) return res.status(400).json({ message: 'กรุณายอมรับเงื่อนไขให้ครบทั้งสองข้อ' });
  if (!signatureUrl) return res.status(400).json({ message: 'กรุณาเซ็นชื่อยืนยัน' });

  const now = new Date();
  const dateStr = toThaiParts(now).dateStr;
  const [record] = await Attendance.findOrCreate({
    where: { userId: req.user.id, date: dateStr },
    defaults: { userId: req.user.id, date: dateStr },
  });

  await record.update({
    checkInAt: record.checkInAt || now,
    checkInMethod: 'override',
    checkOutAt: null,
    checkOutEarly: false,
    checkOutEarlyMinutes: null,
    overrideReason: reason.trim(),
    overrideSignatureUrl: signatureUrl,
  });

  logActivity(req.user, 'access_off_hours', `ขอเข้าถึงข้อมูลนอกเวลา: ${reason.trim()}`);
  res.status(201).json(publicRecord(record));
});

// Owner-only: everyone's attendance for one Thai calendar day, including staff who
// have no record at all yet (shown as "not checked in").
const report = asyncHandler(async (req, res) => {
  const date = req.query.date || toThaiParts(new Date()).dateStr;

  const users = await User.findAll({
    where: { role: ['admin', 'manager'] },
    attributes: ['id', 'name', 'username', 'role', 'status'],
    order: [['name', 'ASC']],
  });
  const records = await Attendance.findAll({ where: { date, userId: users.map((u) => u.id) } });
  const byUserId = Object.fromEntries(records.map((r) => [r.userId, r]));

  const rows = users.map((u) => {
    const r = byUserId[u.id];
    return {
      userId: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      status: u.status,
      ...publicRecord(r) || {
        date, checkInAt: null, checkInLateMinutes: null, checkInMethod: null,
        checkOutAt: null, checkOutEarly: false, checkOutEarlyMinutes: null,
      },
    };
  });

  res.json({ date, rows });
});

module.exports = { status, checkIn, checkOut, getOffHoursAgreement, acceptOffHoursAccess, report };
