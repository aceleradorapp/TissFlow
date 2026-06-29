'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_features', {
      user_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        primaryKey: true,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      tool_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        primaryKey: true,
        references: { model: 'tools', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_features');
  },
};
