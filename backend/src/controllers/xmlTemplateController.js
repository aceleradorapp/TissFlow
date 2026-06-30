'use strict';

const { UserXmlTemplate } = require('../../models');

// GET /api/xml-templates — lista os modelos do usuário logado
exports.list = async (req, res) => {
  try {
    const templates = await UserXmlTemplate.findAll({
      where: { user_id: req.user.id },
      order: [['updated_at', 'DESC']],
    });
    return res.json({ templates });
  } catch (err) {
    console.error('[xml-templates/list]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// POST /api/xml-templates — salva um novo modelo
exports.create = async (req, res) => {
  try {
    const { name, description, version_tiss, transacao_tipo, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ error: 'name e content são obrigatórios.' });
    }

    const template = await UserXmlTemplate.create({
      user_id:        req.user.id,
      name,
      description:    description ?? null,
      version_tiss:   version_tiss ?? null,
      transacao_tipo: transacao_tipo ?? null,
      content:        typeof content === 'string' ? content : JSON.stringify(content),
      is_active:      true,
    });

    return res.status(201).json({ template });
  } catch (err) {
    console.error('[xml-templates/create]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// PUT /api/xml-templates/:id — atualiza dados ou alterna status ativo/inativo
exports.update = async (req, res) => {
  try {
    const template = await UserXmlTemplate.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!template) return res.status(404).json({ error: 'Modelo não encontrado.' });

    const { name, description, is_active, content } = req.body;
    if (name !== undefined)        template.name = name;
    if (description !== undefined) template.description = description;
    if (is_active !== undefined)   template.is_active = !!is_active;
    if (content !== undefined)     template.content = typeof content === 'string' ? content : JSON.stringify(content);

    await template.save();
    return res.json({ template });
  } catch (err) {
    console.error('[xml-templates/update]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// DELETE /api/xml-templates/:id — remove o registro permanentemente
exports.remove = async (req, res) => {
  try {
    const deleted = await UserXmlTemplate.destroy({
      where: { id: req.params.id, user_id: req.user.id },
    });
    if (!deleted) return res.status(404).json({ error: 'Modelo não encontrado.' });
    return res.status(204).send();
  } catch (err) {
    console.error('[xml-templates/remove]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};
