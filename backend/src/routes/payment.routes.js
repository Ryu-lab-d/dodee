const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const authenticate = require('../middleware/auth.middleware');
const requirePermission = require('../middleware/permission.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', requirePermission('paymentManage'), ctrl.create);
router.delete('/:id', requirePermission('paymentManage'), ctrl.remove);

module.exports = router;
