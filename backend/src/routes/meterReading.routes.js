const router = require('express').Router();
const ctrl = require('../controllers/meterReading.controller');
const authenticate = require('../middleware/auth.middleware');
const requirePermission = require('../middleware/permission.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/pending', ctrl.pending);
router.post('/', requirePermission('meterReadingManage'), ctrl.create);

module.exports = router;
