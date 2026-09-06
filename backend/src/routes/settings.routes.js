const router = require('express').Router();
const ctrl = require('../controllers/settings.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.get('/company', ctrl.getCompanySettings);
router.put('/company', authorize('owner'), ctrl.updateCompanySettings);

router.get('/line', authorize('owner'), ctrl.getLineSettings);
router.put('/line', authorize('owner'), ctrl.updateLineSettings);

module.exports = router;
