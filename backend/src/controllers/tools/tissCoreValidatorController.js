'use strict';

const core = require('../../services/tools/tissCoreValidatorService');

/**
 * POST /api/v1/internal/tiss-core-validate
 *
 * Accepts multipart/form-data with field "xml_file".
 * Returns the full ValidationResult from the core engine (includes
 * isValid, summary.totalErrors, and enriched errors with line/field/suggestedFix).
 */
exports.validate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Use multipart/form-data com campo "xml_file".' });
    }
    const result = core.validate(req.file.buffer, req.file.originalname);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[tiss-core-validate]', err);
    return res.status(500).json({ error: 'Erro interno ao processar o XML.' });
  }
};
