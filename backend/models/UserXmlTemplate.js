'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserXmlTemplate extends Model {
    static associate(models) {
      UserXmlTemplate.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  UserXmlTemplate.init(
    {
      user_id: {
        type:      DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type:      DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type:      DataTypes.TEXT,
        allowNull: true,
      },
      version_tiss: {
        type:      DataTypes.STRING(20),
        allowNull: true,
      },
      transacao_tipo: {
        type:      DataTypes.STRING(100),
        allowNull: true,
      },
      content: {
        type:      DataTypes.TEXT('long'),
        allowNull: false,
      },
      is_active: {
        type:         DataTypes.BOOLEAN,
        allowNull:    false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'UserXmlTemplate',
      tableName: 'user_xml_templates',
      underscored: true,
    }
  );

  return UserXmlTemplate;
};
