'use strict';

const swaggerSvc   = require('../../services/tools/swaggerService');
const generatorSvc = require('../../services/tools/generatorService');

exports.listVersions = async (req, res) => {
  try {
    return res.json({ versions: await swaggerSvc.getVersions() });
  } catch (err) {
    console.error('[xml-template-builder/versions]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// GET /entry-node?version_id=X&transaction_type=Y → nó raiz da transação
exports.entryNode = async (req, res) => {
  try {
    const { version_id, transaction_type } = req.query;
    if (!version_id || !transaction_type) {
      return res.status(400).json({ error: 'version_id e transaction_type são obrigatórios.' });
    }
    const result = await generatorSvc.getEntryNode(version_id, transaction_type);
    return res.json(result);
  } catch (err) {
    console.error('[xml-template-builder/entry-node]', err);
    const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'BAD_REQUEST' ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
};

// GET /tree?version_id=X[&node_path=Y] → raiz (sem node_path) ou filhos do tipo XSD Y
exports.getTree = async (req, res) => {
  try {
    const { version_id, node_path } = req.query;
    if (!version_id) return res.status(400).json({ error: 'version_id é obrigatório.' });

    if (!node_path) {
      const root = await swaggerSvc.getRoot(version_id);
      return res.json({ root: root ?? null });
    }

    const children = await swaggerSvc.getChildren(version_id, node_path);
    return res.json({ children });
  } catch (err) {
    console.error('[xml-template-builder/tree]', err);
    if (err.code === 'NO_SCHEMAS') return res.status(404).json({ error: err.message });
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// POST /generate → preview do XML/JSON com as tags opcionais ativas
exports.generate = async (req, res) => {
  try {
    const { version_id, transaction_type, active_optional_paths } = req.body;
    if (!version_id) return res.status(400).json({ error: 'version_id é obrigatório.' });

    const result = await generatorSvc.generate(version_id, transaction_type ?? null, active_optional_paths ?? []);
    return res.json(result);
  } catch (err) {
    console.error('[xml-template-builder/generate]', err);
    const status = ['NOT_FOUND', 'NO_SCHEMAS'].includes(err.code) ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
};
