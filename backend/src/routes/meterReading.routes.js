const router = require('express').Router();
const ctrl = require('../controllers/meterReading.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/pending', ctrl.pending);
router.post('/', authorize('owner', 'staff'), ctrl.create);

module.exports = router;
