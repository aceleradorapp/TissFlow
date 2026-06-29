'use strict';

const { Router }   = require('express');
const planCtrl     = require('../controllers/publicController');
const settingsCtrl = require('../controllers/settingsController');

const router = Router();

// Public — no auth required
router.get('/plans',    planCtrl.getPlans);
router.get('/settings', settingsCtrl.getPublicSettings);

module.exports = router;
