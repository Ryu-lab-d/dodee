const router = require('express').Router();
const ctrl = require('../controllers/transaction.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/summary', ctrl.summary);
router.post('/', authorize('owner', 'accountant'), ctrl.create);
router.put('/:id', authorize('owner', 'accountant'), ctrl.update);
router.delete('/:id', authorize('owner', 'accountant'), ctrl.remove);

module.exports = router;
