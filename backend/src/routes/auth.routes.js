const router = require('express').Router();
const { login, register, me, updateMyProfile, changePassword, getTerms, acceptTerms } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.post('/login', login);
router.post('/register', authenticate, authorize('owner'), register);
router.get('/me', authenticate, me);
router.put('/me/profile', authenticate, updateMyProfile);
router.put('/change-password', authenticate, changePassword);
router.get('/terms', authenticate, getTerms);
router.put('/accept-terms', authenticate, acceptTerms);

module.exports = router;
