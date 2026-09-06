const router = require('express').Router();
const { summary } = require('../controllers/dashboard.controller');
const authenticate = require('../middleware/auth.middleware');

router.get('/summary', authenticate, summary);

module.exports = router;
