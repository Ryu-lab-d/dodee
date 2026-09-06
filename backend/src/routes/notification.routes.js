const router = require('express').Router();
const ctrl = require('../controllers/notification.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.put('/:id/read', ctrl.markRead);
router.put('/read-all', ctrl.markAllRead);
router.post('/run-check', authorize('owner'), ctrl.runCheck);

module.exports = router;
