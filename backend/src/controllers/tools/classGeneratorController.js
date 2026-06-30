'use strict';

const svc = require('../../services/tools/classGeneratorService');

exports.generate = async (req, res) => {
  try {
    const { version_id, transaction_type, language } = req.body;
    if (!version_id || !transaction_type || !language) {
      return res.status(400).json({ error: 'version_id, transaction_type e language são obrigatórios.' });
    }
    const result = await svc.generateCode(version_id, transaction_type, language);
    return res.json(result);
  } catch (err) {
    console.error('[class-generator/generate]', err);
    const status = ['NOT_FOUND', 'NO_SCHEMAS'].includes(err.code) ? 404
      : err.code === 'BAD_REQUEST' ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
};
