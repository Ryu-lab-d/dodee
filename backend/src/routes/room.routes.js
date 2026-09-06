const router = require('express').Router();
const ctrl = require('../controllers/room.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('owner', 'staff'), ctrl.create);
router.put('/:id', authorize('owner', 'staff'), ctrl.update);
router.delete('/:id', authorize('owner'), ctrl.remove);

module.exports = router;
