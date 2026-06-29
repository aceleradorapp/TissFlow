'use strict';

module.exports = {
  async up(queryInterface) {
    // 1. Insert tool (idempotent)
    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM tools WHERE slug = 'version-comparator' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    let toolId;
    if (existing.length > 0) {
      toolId = existing[0].id;
    } else {
      await queryInterface.sequelize.query(
        `INSERT INTO tools (name, slug, description, is_active, created_at, updated_at)
         VALUES (
           'Comparador de Versões TISS',
           'version-comparator',
           'Compara duas versões do padrão TISS/ANS e exibe campos adicionados, removidos e modificados com preview XML e exportação PDF.',
           1, NOW(), NOW()
         )`,
      );
      const [row] = await queryInterface.sequelize.query(
        "SELECT id FROM tools WHERE slug = 'version-comparator' LIMIT 1",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      toolId = row.id;
    }

    // 2. Link to all existing plans (idempotent)
    const plans = await queryInterface.sequelize.query(
      'SELECT id FROM plans',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (plans.length > 0) {
      const rows = plans.map(p => ({
        plan_id:    p.id,
        tool_id:    toolId,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      await queryInterface.bulkInsert('plan_tools', rows, { ignoreDuplicates: true });
    }
  },

  async down(queryInterface) {
    const [tool] = await queryInterface.sequelize.query(
      "SELECT id FROM tools WHERE slug = 'version-comparator' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (tool) {
      await queryInterface.sequelize.query(`DELETE FROM plan_tools WHERE tool_id = ${tool.id}`);
      await queryInterface.sequelize.query(`DELETE FROM tools WHERE id = ${tool.id}`);
    }
  },
};
