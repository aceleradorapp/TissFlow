'use strict';

module.exports = {
  async up(queryInterface) {
    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM tools WHERE slug = 'tiss-validator' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    let toolId;
    if (existing.length > 0) {
      toolId = existing[0].id;
    } else {
      await queryInterface.sequelize.query(
        `INSERT INTO tools (name, slug, description, is_active, created_at, updated_at)
         VALUES (
           'Validador Analítico TISS',
           'tiss-validator',
           'Valida arquivos XML TISS em 3 camadas: conformidade estrutural XSD, integridade do hash MD5 e auditoria matemática das guias e procedimentos.',
           1, NOW(), NOW()
         )`,
      );
      const [row] = await queryInterface.sequelize.query(
        "SELECT id FROM tools WHERE slug = 'tiss-validator' LIMIT 1",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      toolId = row.id;
    }

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
      "SELECT id FROM tools WHERE slug = 'tiss-validator' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (tool) {
      await queryInterface.sequelize.query(`DELETE FROM plan_tools WHERE tool_id = ${tool.id}`);
      await queryInterface.sequelize.query(`DELETE FROM tools WHERE id = ${tool.id}`);
    }
  },
};
