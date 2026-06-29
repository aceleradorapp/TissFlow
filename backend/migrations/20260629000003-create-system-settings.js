'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_settings', {
      id: {
        type:          Sequelize.INTEGER,
        allowNull:     false,
        autoIncrement: true,
        primaryKey:    true,
      },
      key: {
        type:      Sequelize.STRING(100),
        allowNull: false,
        unique:    true,
      },
      value: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      description: {
        type:      Sequelize.STRING(255),
        allowNull: true,
      },
      created_at: {
        type:      Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type:      Sequelize.DATE,
        allowNull: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('system_settings');
  },
};
