const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/properties', require('./property.routes'));
router.use('/rooms', require('./room.routes'));
router.use('/tenants', require('./tenant.routes'));
router.use('/meter-readings', require('./meterReading.routes'));
router.use('/invoices', require('./invoice.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/uploads', require('./upload.routes'));
router.use('/users', require('./user.routes'));
router.use('/settings', require('./settings.routes'));
router.use('/meeting-minutes', require('./meetingMinute.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/transactions', require('./transaction.routes'));
router.use('/activity-log', require('./activityLog.routes'));
router.use('/role-permissions', require('./rolePermission.routes'));
router.use('/calendar', require('./calendar.routes'));

module.exports = router;
