const router = require('express').Router();
const ctrl = require('../controllers/transaction.controller');
const authenticate = require('../middleware/auth.middleware');
const requirePermission = require('../middleware/permission.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/summary', ctrl.summary);
router.post('/', requirePermission('transactionManage'), ctrl.create);
router.put('/:id', requirePermission('transactionManage'), ctrl.update);
router.delete('/:id', requirePermission('transactionManage'), ctrl.remove);

module.exports = router;
