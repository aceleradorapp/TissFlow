'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'trial_ends_at', {
      type: Sequelize.DATE,
      allowNull: true,
      after: 'plan_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'trial_ends_at');
  },
};
