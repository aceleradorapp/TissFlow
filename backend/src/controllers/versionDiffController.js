'use strict';

const { TissVersionChange, TissVersion } = require('../../models');
const svc = require('../services/tools/versionDiffService');

exports.listVersions = async (_req, res) => {
  try {
    const versions = await TissVersion.findAll({
      where:      { is_active: true },
      attributes: ['id', 'version', 'release_date'],
      order:      [['version', 'DESC']],
    });
    return res.json({ versions });
  } catch (err) {
    console.error('[listVersions]', err);
    return res.status(500).json({ error: 'Erro ao listar versões.' });
  }
};

exports.generateDiff = async (req, res) => {
  const { sourceVersion, targetVersion } = req.body ?? {};

  if (!sourceVersion?.trim() || !targetVersion?.trim()) {
    return res.status(400).json({ error: 'sourceVersion e targetVersion são obrigatórios.' });
  }
  if (sourceVersion.trim() === targetVersion.trim()) {
    return res.status(400).json({ error: 'As versões de origem e destino devem ser diferentes.' });
  }

  try {
    const result = await svc.generateVersionDiff(
      TissVersionChange,
      sourceVersion.trim(),
      targetVersion.trim(),
    );
    return res.json({
      message: `Diff gerado com sucesso: ${result.total} mudança(s) registrada(s).`,
      ...result,
    });
  } catch (err) {
    console.error('[generateDiff]', err);
    if (err.code === 'VERSION_NOT_FOUND') {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: `Erro ao gerar diff: ${err.message}` });
  }
};
