'use strict';

const svc = require('../../services/tools/swaggerService');

exports.listVersions = async (req, res) => {
  try {
    return res.json({ versions: await svc.getVersions() });
  } catch (err) {
    console.error('[swagger/versions]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// GET /tree?version_id=X            → returns root node (mensagemTISS)
// GET /tree?version_id=X&node_path=Y → returns direct children of XSD type Y
exports.getTree = async (req, res) => {
  try {
    const { version_id, node_path } = req.query;
    if (!version_id) return res.status(400).json({ error: 'version_id é obrigatório.' });

    if (!node_path) {
      const root = await svc.getRoot(version_id);
      return res.json({ root: root ?? null });
    }

    const children = await svc.getChildren(version_id, node_path);
    return res.json({ children });
  } catch (err) {
    console.error('[swagger/tree]', err);
    if (err.code === 'NO_SCHEMAS') return res.status(404).json({ error: err.message });
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.search = async (req, res) => {
  try {
    const { version_id, q } = req.query;
    if (!version_id || !q) {
      return res.status(400).json({ error: 'version_id e q são obrigatórios.' });
    }
    const results = await svc.searchField(version_id, q);
    return res.json({ results });
  } catch (err) {
    console.error('[swagger/search]', err);
    if (err.code === 'NO_SCHEMAS') return res.status(404).json({ error: err.message });
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};
