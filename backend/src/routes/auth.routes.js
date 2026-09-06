const router = require('express').Router();
const { login, register, me, changePassword } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.post('/login', login);
router.post('/register', authenticate, authorize('owner'), register);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
