'use strict';

module.exports = {
  async up(queryInterface) {
    const plans = await queryInterface.sequelize.query(
      'SELECT id FROM plans',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const tools = await queryInterface.sequelize.query(
      "SELECT id FROM tools WHERE slug IN ('swagger-visual', 'xml-generator')",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (!plans.length || !tools.length) return;

    const now  = new Date();
    const rows = [];
    for (const plan of plans) {
      for (const tool of tools) {
        rows.push({ plan_id: plan.id, tool_id: tool.id, created_at: now, updated_at: now });
      }
    }

    // ignoreDuplicates: re-runs são seguros
    await queryInterface.bulkInsert('plan_tools', rows, { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE pt FROM plan_tools pt
       INNER JOIN tools t ON pt.tool_id = t.id
       WHERE t.slug IN ('swagger-visual', 'xml-generator')`,
    );
  },
};
