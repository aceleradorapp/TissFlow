'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserDocument extends Model {
    static associate(models) {
      UserDocument.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    }
  }

  UserDocument.init(
    {
      user_id: {
        type:      DataTypes.INTEGER,
        allowNull: false,
      },
      filename: {
        type:         DataTypes.STRING(255),
        allowNull:    false,
        defaultValue: 'documento.xml',
      },
      raw_xml: {
        type:      DataTypes.TEXT('long'),
        allowNull: false,
      },
      version: {
        type:      DataTypes.STRING(20),
        allowNull: true,
      },
      transaction_type: {
        type:      DataTypes.STRING(100),
        allowNull: true,
      },
      error_count: {
        type:         DataTypes.INTEGER,
        allowNull:    false,
        defaultValue: 0,
      },
      description: {
        type:      DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'UserDocument',
      tableName: 'user_documents',
      underscored: true,
    }
  );

  return UserDocument;
};
