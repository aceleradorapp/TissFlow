'use strict';

module.exports = {
  async up(queryInterface) {
    // Insert tiss-ide tool (idempotent)
    const [tools] = await queryInterface.sequelize.query(
      `SELECT id FROM tools WHERE slug = 'tiss-ide' LIMIT 1`
    );

    let toolId;

    if (tools.length === 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO tools (name, slug, description, created_at, updated_at)
        VALUES (
          'IDE Interativa TISS',
          'tiss-ide',
          'Ambiente de desenvolvimento integrado para edição, validação e correção de XMLs TISS com análise semântica via XSD.',
          NOW(), NOW()
        )
      `);

      const [row] = await queryInterface.sequelize.query(
        `SELECT id FROM tools WHERE slug = 'tiss-ide' LIMIT 1`
      );
      toolId = row[0].id;
    } else {
      toolId = tools[0].id;
    }

    // Link to all existing plans (idempotent)
    const [plans] = await queryInterface.sequelize.query(`SELECT id FROM plans`);
    for (const plan of plans) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT 1 FROM plan_tools WHERE plan_id = ${plan.id} AND tool_id = ${toolId} LIMIT 1`
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(`
          INSERT INTO plan_tools (plan_id, tool_id, created_at, updated_at)
          VALUES (${plan.id}, ${toolId}, NOW(), NOW())
        `);
      }
    }
  },

  async down(queryInterface) {
    const [tools] = await queryInterface.sequelize.query(
      `SELECT id FROM tools WHERE slug = 'tiss-ide' LIMIT 1`
    );
    if (tools.length > 0) {
      const toolId = tools[0].id;
      await queryInterface.sequelize.query(`DELETE FROM plan_tools WHERE tool_id = ${toolId}`);
      await queryInterface.sequelize.query(`DELETE FROM tools WHERE id = ${toolId}`);
    }
  },
};
