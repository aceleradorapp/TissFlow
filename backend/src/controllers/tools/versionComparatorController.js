'use strict';

const { TissVersionChange, TissVersion } = require('../../../models');

exports.listVersions = async (_req, res) => {
  try {
    const versions = await TissVersion.findAll({
      where:      { is_active: true },
      attributes: ['id', 'version', 'release_date'],
      order:      [['version', 'DESC']],
    });

    // Return distinct pairs that have been generated so the UI can flag "não processado"
    const pairs = await TissVersionChange.findAll({
      attributes: ['source_version', 'target_version'],
      group:      ['source_version', 'target_version'],
      raw:        true,
    });

    return res.json({ versions, generatedPairs: pairs });
  } catch (err) {
    console.error('[versionComparator.listVersions]', err);
    return res.status(500).json({ error: 'Erro ao listar versões.' });
  }
};

exports.getDiff = async (req, res) => {
  const { sourceVersion, targetVersion } = req.query;

  if (!sourceVersion?.trim() || !targetVersion?.trim()) {
    return res.status(400).json({ error: 'sourceVersion e targetVersion são obrigatórios.' });
  }
  if (sourceVersion.trim() === targetVersion.trim()) {
    return res.status(400).json({ error: 'As versões source e target devem ser diferentes.' });
  }

  try {
    // Fetch ordered by xpath so shorter (more canonical) paths come first,
    // then dedup in memory by (guia_type, field_name, change_type, description).
    // This tolerates any legacy duplicates already stored in the table and
    // mirrors the deduplication applied at generation time.
    const raw = await TissVersionChange.findAll({
      where: {
        source_version: sourceVersion.trim(),
        target_version: targetVersion.trim(),
      },
      attributes: ['id', 'guia_type', 'xpath', 'field_name', 'change_type', 'description'],
      order: [
        ['xpath', 'ASC'],
        ['change_type', 'ASC'],
      ],
    });

    const seen = new Set();
    const changes = raw.filter(c => {
      const key = `${c.guia_type}||${c.field_name}||${c.change_type}||${c.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Re-sort for presentation: change_type then field_name
    changes.sort((a, b) =>
      a.change_type.localeCompare(b.change_type) ||
      a.field_name.localeCompare(b.field_name)
    );

    const adds     = changes.filter(c => c.change_type === 'ADD').length;
    const removed  = changes.filter(c => c.change_type === 'REMOVED').length;
    const modified = changes.filter(c => c.change_type === 'MODIFIED').length;

    return res.json({
      sourceVersion: sourceVersion.trim(),
      targetVersion: targetVersion.trim(),
      total: changes.length,
      summary: { adds, removed, modified },
      changes,
    });
  } catch (err) {
    console.error('[versionComparator.getDiff]', err);
    return res.status(500).json({ error: 'Erro ao buscar diferenças.' });
  }
};
