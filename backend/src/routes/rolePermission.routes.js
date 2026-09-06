const router = require('express').Router();
const ctrl = require('../controllers/rolePermission.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

// Owner-only, always: editing the permission matrix itself must never be delegable
// (otherwise a granted role could hand itself more access).
router.use(authenticate, authorize('owner'));

router.get('/', ctrl.list);
router.put('/:role', ctrl.update);

module.exports = router;
