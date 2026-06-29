'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/publicController');

const router = Router();

// Public — no auth required
router.get('/plans', ctrl.getPlans);

module.exports = router;
