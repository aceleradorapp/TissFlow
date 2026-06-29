'use strict';

const fs   = require('fs');
const path = require('path');

const { TissVersion }  = require('../../models');
const { clearCache }   = require('../services/tools/swaggerService');

// Resolve para backend/src/storage/schemas/
const SCHEMAS_BASE = path.join(__dirname, '..', 'storage', 'schemas');

exports.uploadXsd = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo XSD enviado.' });
    }

    const { version, release_date } = req.body;
    if (!version?.trim()) {
      return res.status(400).json({ error: 'O campo version é obrigatório (ex: "4.01.00").' });
    }

    // Normaliza "4.01.00" → "v4_01_00"
    const folderName = 'v' + version.trim().replace(/\./g, '_');
    const destDir    = path.join(SCHEMAS_BASE, folderName);

    // Limpa re-upload: destrói pasta anterior e recria do zero
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }
    fs.mkdirSync(destDir, { recursive: true });

    // Salva cada arquivo com o nome original intacto
    for (const file of req.files) {
      fs.writeFileSync(path.join(destDir, file.originalname), file.buffer);
    }

    // Registra ou atualiza a versão na tabela tiss_versions
    const [tissVersion, wasCreated] = await TissVersion.findOrCreate({
      where:    { version: version.trim() },
      defaults: { release_date: release_date || null, is_active: true },
    });

    if (!wasCreated) {
      await tissVersion.update({
        is_active:    true,
        ...(release_date ? { release_date } : {}),
      });
    }

    // Invalidate the in-memory XSD registry so next request parses the new files
    clearCache(version.trim());

    return res.status(200).json({
      message:        `Versão TISS '${tissVersion.version}' armazenada com sucesso.`,
      versionId:      tissVersion.id,
      versionCreated: wasCreated,
      filesStored:    req.files.length,
      storagePath:    `src/storage/schemas/${folderName}`,
    });
  } catch (err) {
    console.error('[uploadXsd]', err);
    return res.status(500).json({ error: `Erro ao salvar os arquivos XSD: ${err.message}` });
  }
};
