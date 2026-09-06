const router = require('express').Router();
const ctrl = require('../controllers/invoice.controller');
const authenticate = require('../middleware/auth.middleware');
const requirePermission = require('../middleware/permission.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/generate', requirePermission('invoiceManage'), ctrl.generate);

module.exports = router;
