'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    // bulkInsert bypasses Model hooks, so we hash the password manually here
    const [roles] = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE name = 'proprietario' LIMIT 1"
    );
    const roleId = roles[0].id;

    await queryInterface.bulkInsert('users', [
      {
        role_id:                roleId,
        plan_id:                null,
        name:                   'Administrador',
        email:                  'admin@tissflow.com',
        password:               bcrypt.hashSync('admin123', 12),
        status:                 'active',
        password_reset_token:   null,
        password_reset_expires: null,
        created_at:             new Date(),
        updated_at:             new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'admin@tissflow.com' }, {});
  },
};
