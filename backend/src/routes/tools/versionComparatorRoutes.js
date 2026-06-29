'use strict';

const { Router } = require('express');
const auth  = require('../../middlewares/authMiddleware');
const ctrl  = require('../../controllers/tools/versionComparatorController');

const router = Router();

// Any logged-in user can read version diffs
router.get('/versions', auth, ctrl.listVersions);
router.get('/',         auth, ctrl.getDiff);

module.exports = router;
