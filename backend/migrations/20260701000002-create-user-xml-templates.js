'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_xml_templates', {
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
      name: {
        type:      Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type:      Sequelize.TEXT,
        allowNull: true,
      },
      version_tiss: {
        type:      Sequelize.STRING(20),
        allowNull: true,
      },
      transacao_tipo: {
        type:      Sequelize.STRING(100),
        allowNull: true,
      },
      content: {
        type:      Sequelize.TEXT('long'),
        allowNull: false,
      },
      is_active: {
        type:         Sequelize.BOOLEAN,
        allowNull:    false,
        defaultValue: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_xml_templates');
  },
};
