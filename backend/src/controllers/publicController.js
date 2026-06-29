'use strict';

const { Op }       = require('sequelize');
const { Plan, Tool } = require('../../models');

exports.getPlans = async (_req, res) => {
  try {
    const plans = await Plan.findAll({
      where: {
        name: { [Op.ne]: 'Free Trial' },
      },
      include: [{
        model:    Tool,
        as:       'tools',
        where:    { is_active: true },
        required: false,
        through:  { attributes: [] },
        attributes: ['id', 'name', 'slug'],
      }],
      order: [['price', 'ASC']],
    });

    return res.json({ plans });
  } catch (err) {
    console.error('[public/getPlans]', err);
    return res.status(500).json({ error: 'Erro ao buscar planos.' });
  }
};
