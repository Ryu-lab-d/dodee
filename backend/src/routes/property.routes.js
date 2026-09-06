const router = require('express').Router();
const ctrl = require('../controllers/property.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', authorize('owner'), ctrl.create);
router.put('/:id', authorize('owner'), ctrl.update);
router.delete('/:id', authorize('owner'), ctrl.remove);
router.post('/:id/assign', authorize('owner'), ctrl.assignUser);

module.exports = router;
