'use strict';

const { Router } = require('express');
const multer     = require('multer');
const auth       = require('../middlewares/authMiddleware');
const ctrl       = require('../controllers/tools/tissCoreValidatorController');

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.xml$/i.test(file.originalname)) return cb(null, true);
    cb(new Error('Apenas arquivos .xml são permitidos.'));
  },
});

// Internal — requires auth but no tool-plan check (consumed by first-party tools)
router.post('/tiss-core-validate', auth, upload.single('xml_file'), ctrl.validate);

module.exports = router;
