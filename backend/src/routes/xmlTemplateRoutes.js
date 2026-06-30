'use strict';

const { Router } = require('express');
const auth       = require('../middlewares/authMiddleware');
const ctrl       = require('../controllers/xmlTemplateController');

const router = Router();

router.get('/',     auth, ctrl.list);
router.post('/',    auth, ctrl.create);
router.put('/:id',  auth, ctrl.update);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;
