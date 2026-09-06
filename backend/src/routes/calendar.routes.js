const router = require('express').Router();
const ctrl = require('../controllers/calendar.controller');
const authenticate = require('../middleware/auth.middleware');

router.get('/', authenticate, ctrl.list);

module.exports = router;
