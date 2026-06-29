'use strict';

const { Op }             = require('sequelize');
const { User, Tool, Plan } = require('../../models');

exports.getStats = async (req, res) => {
  try {
    const now     = new Date();
    const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // createdAt é o nome do atributo Sequelize (underscored → coluna created_at)
    const [totalUsers, todaySignups, weekSignups, activeFeatures, plans] = await Promise.all([
      User.count(),
      User.count({ where: { createdAt: { [Op.gte]: today   } } }),
      User.count({ where: { createdAt: { [Op.gte]: weekAgo } } }),
      Tool.count({ where: { is_active: true } }),
      Plan.findAll({
        attributes: ['id', 'name', 'price'],
        include: [{
          model:      Tool,
          as:         'tools',
          attributes: ['id', 'name', 'slug'],
          through:    { attributes: [] },
          required:   false,
        }],
        order: [['id', 'ASC']],
      }),
    ]);

    // Contagem de usuários por plano em paralelo
    const planDistribution = await Promise.all(
      plans.map(async (plan) => ({
        id:        plan.id,
        name:      plan.name,
        price:     plan.price,
        userCount: await User.count({ where: { plan_id: plan.id } }),
        tools:     plan.tools.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
      })),
    );

    // recentLogs: tabela de auditoria — será implementada na fase de logs
    const recentLogs = [];

    return res.json({
      totalUsers,
      todaySignups,
      weekSignups,
      activeFeatures,
      planDistribution,
      recentLogs,
    });
  } catch (err) {
    console.error('[dashboard/stats]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};
