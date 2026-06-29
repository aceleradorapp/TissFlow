'use strict';

const { SystemSetting } = require('../../models');

exports.getPublicSettings = async (_req, res) => {
  try {
    const rows = await SystemSetting.findAll({ attributes: ['key', 'value'] });
    const settings = {};
    rows.forEach((r) => { settings[r.key] = r.value; });
    return res.json({ settings });
  } catch (err) {
    console.error('[getPublicSettings]', err);
    return res.status(500).json({ error: 'Erro ao buscar configurações.' });
  }
};

exports.updateAdminSettings = async (req, res) => {
  try {
    const { settings } = req.body ?? {};
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'O campo "settings" (objeto) é obrigatório.' });
    }

    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        SystemSetting.update({ value: String(value) }, { where: { key } })
      )
    );

    return res.json({ message: 'Configurações salvas com sucesso.' });
  } catch (err) {
    console.error('[updateAdminSettings]', err);
    return res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
};
