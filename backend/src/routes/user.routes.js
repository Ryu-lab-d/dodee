const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', authorize('owner'), ctrl.list);
router.get('/colleagues', ctrl.colleagues);
router.put('/:id', authorize('owner'), ctrl.update);
router.put('/:id/assign-properties', authorize('owner'), ctrl.assignProperties);

router.post('/me/line-link-code', ctrl.generateLineLinkCode);
router.delete('/me/line', ctrl.unlinkLine);

module.exports = router;
