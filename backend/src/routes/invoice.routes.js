const router = require('express').Router();
const ctrl = require('../controllers/invoice.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/generate', authorize('owner', 'accountant'), ctrl.generate);

module.exports = router;
