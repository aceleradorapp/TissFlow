'use strict';

module.exports = {
  async up(queryInterface) {
    // 1. Insert plan (idempotent)
    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM plans WHERE name = 'Free Trial' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    let planId;
    if (existing.length > 0) {
      planId = existing[0].id;
    } else {
      await queryInterface.sequelize.query(
        `INSERT INTO plans (name, price, created_at, updated_at)
         VALUES ('Free Trial', 0.00, NOW(), NOW())`,
      );
      const [row] = await queryInterface.sequelize.query(
        "SELECT id FROM plans WHERE name = 'Free Trial' LIMIT 1",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      planId = row.id;
    }

    // 2. Link all active tools to Free Trial (idempotent)
    const tools = await queryInterface.sequelize.query(
      'SELECT id FROM tools WHERE is_active = 1',
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (tools.length > 0) {
      const rows = tools.map(t => ({
        plan_id:    planId,
        tool_id:    t.id,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      await queryInterface.bulkInsert('plan_tools', rows, { ignoreDuplicates: true });
    }
  },

  async down(queryInterface) {
    const [plan] = await queryInterface.sequelize.query(
      "SELECT id FROM plans WHERE name = 'Free Trial' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (plan) {
      await queryInterface.sequelize.query(`DELETE FROM plan_tools WHERE plan_id = ${plan.id}`);
      await queryInterface.sequelize.query(`DELETE FROM plans WHERE id = ${plan.id}`);
    }
  },
};
