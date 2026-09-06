const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', authorize('owner', 'accountant'), ctrl.create);
router.delete('/:id', authorize('owner', 'accountant'), ctrl.remove);

module.exports = router;
