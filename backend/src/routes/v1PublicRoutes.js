'use strict';

const { Router } = require('express');
const multer     = require('multer');

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

// Temporary 403 lock — API key access coming soon on corporate plans
router.post('/validate', upload.single('xml_file'), (_req, res) => {
  return res.status(403).json({
    error:   'API_ACCESS_LOCKED',
    message: 'O acesso via API está disponível apenas para planos corporativos com chaves integradas. Gerencie suas chaves no painel (Em breve).',
  });
});

module.exports = router;
