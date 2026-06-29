'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_documents', 'description', {
      type:      Sequelize.TEXT,
      allowNull: true,
      after:     'error_count',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('user_documents', 'description');
  },
};
