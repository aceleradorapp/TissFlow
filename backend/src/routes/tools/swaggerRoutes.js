'use strict';

const { Router }    = require('express');
const auth          = require('../../middlewares/authMiddleware');
const toolAccess    = require('../../middlewares/toolMiddleware');
const ctrl          = require('../../controllers/tools/swaggerController');

const router = Router();
const guard  = [auth, toolAccess('swagger-visual')];

router.get('/versions', ...guard, ctrl.listVersions);
router.get('/tree',     ...guard, ctrl.getTree);    // ?version_id=X[&node_path=Y]
router.get('/search',   ...guard, ctrl.search);     // ?version_id=X&q=term

module.exports = router;
