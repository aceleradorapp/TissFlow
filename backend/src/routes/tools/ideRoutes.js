'use strict';

const { Router } = require('express');
const multer     = require('multer');
const auth       = require('../../middlewares/authMiddleware');
const toolAccess = require('../../middlewares/toolMiddleware');
const ctrl       = require('../../controllers/tools/ideController');

const router = Router();
const guard  = [auth, toolAccess('tiss-ide')];

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.xml$/i.test(file.originalname)) return cb(null, true);
    cb(new Error('Apenas arquivos .xml são permitidos.'));
  },
});

router.post('/parse',              ...guard, upload.single('xml_file'), ctrl.parseXml);
router.post('/rebuild',            ...guard, ctrl.rebuildXml);
router.post('/documents',          ...guard, ctrl.saveDocument);
router.get('/documents',           ...guard, ctrl.listDocuments);
router.delete('/documents/:id',    ...guard, ctrl.deleteDocument);

module.exports = router;
