'use strict';

const { Plan, Tool, User } = require('../../models');

module.exports = (toolSlug) => async (req, res, next) => {
  try {
    // Proprietários têm acesso irrestrito a todas as ferramentas
    if (req.user?.role?.name === 'proprietario') {
      return next();
    }

    // Ferramenta deve existir e estar ativa globalmente
    const tool = await Tool.findOne({ where: { slug: toolSlug, is_active: true } });
    if (!tool) {
      return res.status(404).json({ error: 'Ferramenta não encontrada.' });
    }

    // 1. Acesso via plano do usuário
    if (req.user?.plan_id) {
      const plan = await Plan.findByPk(req.user.plan_id, {
        include: [{
          model:    Tool,
          as:       'tools',
          where:    { id: tool.id },
          required: true,
          through:  { attributes: [] },
        }],
      });
      if (plan) return next();
    }

    // 2. Acesso via add-on individual (user_features)
    const userWithAddon = await User.findOne({
      where:   { id: req.user.id },
      include: [{
        model:    Tool,
        as:       'addonTools',
        where:    { id: tool.id },
        required: true,
        through:  { attributes: [] },
      }],
    });
    if (userWithAddon) return next();

    console.log(
      `[toolMiddleware] BLOQUEADO user_id=${req.user?.id} plan_id=${req.user?.plan_id ?? 'null'} slug=${toolSlug}`
    );
    return res.status(403).json({
      error: 'Esta ferramenta não está disponível no seu plano atual.',
    });
  } catch (err) {
    console.error('[toolMiddleware]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};
