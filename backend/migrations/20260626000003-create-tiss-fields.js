'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tiss_fields', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      type_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tiss_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tiss_fields',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      version_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tiss_versions',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      min_occurs: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      max_occurs: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      min_length: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      max_length: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      pattern_regex: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      xpath: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_required: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tiss_fields');
  },
};
