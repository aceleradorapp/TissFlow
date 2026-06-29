'use strict';

module.exports = {
  async up(queryInterface) {
    // 1. Insere a ferramenta tiss-viewer (idempotente)
    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM tools WHERE slug = 'tiss-viewer' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    let toolId;
    if (existing.length > 0) {
      toolId = existing[0].id;
    } else {
      await queryInterface.sequelize.query(
        `INSERT INTO tools (name, slug, description, is_active, created_at, updated_at)
         VALUES ('Visualizador TISS', 'tiss-viewer',
                 'Visualizador humanizado e validador de XML TISS com detecção automática de versão.',
                 1, NOW(), NOW())`,
      );
      const [row] = await queryInterface.sequelize.query(
        "SELECT id FROM tools WHERE slug = 'tiss-viewer' LIMIT 1",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      toolId = row.id;
    }

    // 2. Vincula a todos os planos existentes (idempotente via ignoreDuplicates)
    const plans = await queryInterface.sequelize.query(
      'SELECT id FROM plans',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (plans.length > 0) {
      const rows = plans.map((p) => ({
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
      "SELECT id FROM tools WHERE slug = 'tiss-viewer' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (tool) {
      await queryInterface.sequelize.query(`DELETE FROM plan_tools WHERE tool_id = ${tool.id}`);
      await queryInterface.sequelize.query(`DELETE FROM tools WHERE id = ${tool.id}`);
    }
  },
};
