const router = require('express').Router();
const authenticate = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const ctrl = require('../controllers/upload.controller');

// Any authenticated role can upload (e.g. accountants signing the terms flow);
// callers that create the resource referencing the file enforce their own role checks.
router.post('/', authenticate, upload.single('file'), ctrl.create);

module.exports = router;
