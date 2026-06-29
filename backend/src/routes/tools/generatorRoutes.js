'use strict';

const { Router } = require('express');
const auth       = require('../../middlewares/authMiddleware');
const toolAccess = require('../../middlewares/toolMiddleware');
const ctrl       = require('../../controllers/tools/generatorController');

const router = Router();
const guard  = [auth, toolAccess('xml-generator')];

router.get('/entry-node', ...guard, ctrl.entryNode);  // ?version_id=X&transaction_type=Y
router.post('/generate',  ...guard, ctrl.generate);

module.exports = router;
