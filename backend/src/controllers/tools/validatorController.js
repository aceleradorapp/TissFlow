'use strict';

const svc = require('../../services/tools/tissValidatorService');

exports.validateFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Use multipart/form-data com campo "xml_file".' });
    }

    const result = svc.validateXml(req.file.buffer, req.file.originalname);
    return res.status(200).json(result);
  } catch (err) {
    if (err.code === 'PARSE_ERROR') {
      return res.status(422).json({ error: err.message });
    }
    console.error('[validator/validate-file]', err);
    return res.status(500).json({ error: 'Erro interno ao processar o XML.' });
  }
};
