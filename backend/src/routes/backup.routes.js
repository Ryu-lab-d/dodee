const router = require('express').Router();
const ctrl = require('../controllers/backup.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate, authorize('owner'));

router.get('/export', ctrl.exportData);

module.exports = router;
