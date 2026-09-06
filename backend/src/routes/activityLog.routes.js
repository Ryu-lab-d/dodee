const router = require('express').Router();
const ctrl = require('../controllers/activityLog.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.get('/', authenticate, authorize('owner'), ctrl.list);

module.exports = router;
