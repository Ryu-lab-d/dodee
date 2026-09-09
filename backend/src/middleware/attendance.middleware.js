const { hasAccessToday } = require('../utils/attendance');

// Blocks every non-owner request until the user has checked in for work today (or been
// granted off-hours access). Mounted globally in routes/index.js, exempting only the
// routes a not-yet-checked-in user must still be able to reach (auth, attendance, uploads).
const requireCheckedIn = async (req, res, next) => {
  if (await hasAccessToday(req.user)) return next();
  res.status(403).json({ code: 'NOT_CHECKED_IN', message: 'กรุณาเช็คชื่อเข้างานก่อนเข้าถึงข้อมูล' });
};

module.exports = requireCheckedIn;
