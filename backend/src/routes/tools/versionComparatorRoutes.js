'use strict';

const { Router }     = require('express');
const auth           = require('../../middlewares/authMiddleware');
const checkTrial     = require('../../middlewares/checkTrialStatus');
const ctrl           = require('../../controllers/tools/versionComparatorController');

const router = Router();

router.get('/versions', auth, checkTrial, ctrl.listVersions);
router.get('/',         auth, checkTrial, ctrl.getDiff);

module.exports = router;
