'use strict';

const svc = require('../../services/tools/viewerService');

exports.parseXml = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Use multipart/form-data com campo "xml_file".' });
    }

    if (!/\.(xml)$/i.test(req.file.originalname)) {
      return res.status(400).json({ error: 'Apenas arquivos .xml são aceitos.' });
    }

    const result = svc.parseXml(req.file.buffer);
    return res.status(200).json(result);
  } catch (err) {
    if (err.code === 'PARSE_ERROR' || err.code === 'INVALID_TISS') {
      return res.status(422).json({ error: err.message });
    }
    console.error('[viewer/parse]', err);
    return res.status(500).json({ error: 'Erro interno ao processar o XML.' });
  }
};
