'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tiss_version_changes', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      source_version: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      target_version: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      guia_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      xpath: {
        type: Sequelize.STRING(600),
        allowNull: false,
      },
      field_name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      change_type: {
        type: Sequelize.ENUM('ADD', 'REMOVED', 'MODIFIED'),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('tiss_version_changes', ['source_version', 'target_version'], {
      name: 'idx_tvc_version_pair',
    });
    await queryInterface.addIndex('tiss_version_changes', ['change_type'], {
      name: 'idx_tvc_change_type',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tiss_version_changes');
  },
};
