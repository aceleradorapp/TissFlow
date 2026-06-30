'use strict';

const { Router } = require('express');
const multer     = require('multer');
const auth       = require('../../middlewares/authMiddleware');
const toolAccess = require('../../middlewares/toolMiddleware');
const ctrl       = require('../../controllers/tools/validatorController');

const router = Router();
const guard  = [auth, toolAccess('tiss-validator')];

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.xml$/i.test(file.originalname)) return cb(null, true);
    cb(new Error('Apenas arquivos .xml são permitidos.'));
  },
});

router.post('/validate-file', ...guard, upload.single('xml_file'), ctrl.validateFile);

module.exports = router;
