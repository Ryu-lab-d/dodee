const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/status', ctrl.status);
router.post('/check-in', ctrl.checkIn);
router.post('/check-out', ctrl.checkOut);
router.get('/off-hours-agreement', ctrl.getOffHoursAgreement);
router.post('/off-hours-access', ctrl.acceptOffHoursAccess);
router.get('/report', authorize('owner'), ctrl.report);

module.exports = router;
