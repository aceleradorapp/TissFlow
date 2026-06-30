'use strict';

const { Router } = require('express');
const auth       = require('../../middlewares/authMiddleware');
const toolAccess = require('../../middlewares/toolMiddleware');
const ctrl       = require('../../controllers/tools/classGeneratorController');

const router = Router();
const guard  = [auth, toolAccess('class-generator')];

router.post('/generate', ...guard, ctrl.generate);

module.exports = router;
