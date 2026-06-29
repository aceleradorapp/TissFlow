'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_documents', {
      id: {
        type:          Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey:    true,
      },
      user_id: {
        type:       Sequelize.INTEGER,
        allowNull:  false,
        references: { model: 'users', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      filename: {
        type:         Sequelize.STRING(255),
        allowNull:    false,
        defaultValue: 'documento.xml',
      },
      raw_xml: {
        type:      Sequelize.TEXT('long'),
        allowNull: false,
      },
      version: {
        type:      Sequelize.STRING(20),
        allowNull: true,
      },
      transaction_type: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      error_count: {
        type:         Sequelize.INTEGER,
        allowNull:    false,
        defaultValue: 0,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_documents');
  },
};
