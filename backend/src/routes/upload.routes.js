const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');
const upload = require('../middleware/upload.middleware');
const ctrl = require('../controllers/upload.controller');

router.post('/', authenticate, authorize('owner', 'staff'), upload.single('file'), ctrl.create);

module.exports = router;
