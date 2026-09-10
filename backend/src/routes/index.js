const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const requireCheckedIn = require('../middleware/attendance.middleware');

// Exempt from the attendance gate: auth (login/terms/self), attendance itself (you must
// be able to check in before you're "checked in"), and uploads (needed for the signature
// image in the off-hours access flow, before that access has been granted).
router.use('/auth', require('./auth.routes'));
router.use('/attendance', require('./attendance.routes'));
router.use('/uploads', require('./upload.routes'));

// Everything below requires the user to be checked in for work today (owners exempt) -
// see utils/attendance.js:hasAccessToday.
router.use(authenticate, requireCheckedIn);

router.use('/properties', require('./property.routes'));
router.use('/rooms', require('./room.routes'));
router.use('/tenants', require('./tenant.routes'));
router.use('/meter-readings', require('./meterReading.routes'));
router.use('/invoices', require('./invoice.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/users', require('./user.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/meeting-minutes', require('./meetingMinute.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/transactions', require('./transaction.routes'));
router.use('/activity-log', require('./activityLog.routes'));
router.use('/role-permissions', require('./rolePermission.routes'));
router.use('/calendar', require('./calendar.routes'));
router.use('/backup', require('./backup.routes'));

module.exports = router;
