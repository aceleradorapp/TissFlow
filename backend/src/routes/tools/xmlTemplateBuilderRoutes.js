'use strict';

const { Router }    = require('express');
const auth          = require('../../middlewares/authMiddleware');
const toolAccess    = require('../../middlewares/toolMiddleware');
const ctrl          = require('../../controllers/tools/xmlTemplateBuilderController');

const router = Router();
const guard  = [auth, toolAccess('xml-template-builder')];

router.get('/versions',   ...guard, ctrl.listVersions);
router.get('/entry-node', ...guard, ctrl.entryNode);
router.get('/tree',       ...guard, ctrl.getTree);
router.post('/generate',  ...guard, ctrl.generate);

module.exports = router;
