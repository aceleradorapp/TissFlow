'use strict';

const { Router } = require('express');
const multer     = require('multer');
const auth       = require('../../middlewares/authMiddleware');
const toolAccess = require('../../middlewares/toolMiddleware');
const ctrl       = require('../../controllers/tools/viewerController');

const router = Router();
const guard  = [auth, toolAccess('tiss-viewer')];

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (/\.xml$/i.test(file.originalname)) return cb(null, true);
    cb(new Error('Apenas arquivos .xml são permitidos.'));
  },
});

router.post('/parse', ...guard, upload.single('xml_file'), ctrl.parseXml);

module.exports = router;
