'use strict';

const svc = require('../../services/tools/generatorService');

exports.entryNode = async (req, res) => {
  try {
    const { version_id, transaction_type } = req.query;
    if (!version_id || !transaction_type) {
      return res.status(400).json({ error: 'version_id e transaction_type são obrigatórios.' });
    }
    const result = await svc.getEntryNode(version_id, transaction_type);
    return res.json(result);
  } catch (err) {
    console.error('[generator/entry-node]', err);
    const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'BAD_REQUEST' ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
};

exports.generate = async (req, res) => {
  try {
    const { version_id, transaction_type, active_optional_paths } = req.body;
    if (!version_id) return res.status(400).json({ error: 'version_id é obrigatório.' });

    const result = await svc.generate(version_id, transaction_type ?? null, active_optional_paths ?? []);
    return res.json(result);
  } catch (err) {
    console.error('[generator/generate]', err);
    const status = ['NOT_FOUND', 'NO_SCHEMAS'].includes(err.code) ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
};
