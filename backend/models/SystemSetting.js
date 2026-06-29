'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SystemSetting extends Model {
    static associate() {}
  }

  SystemSetting.init(
    {
      key: {
        type:      DataTypes.STRING(100),
        allowNull: false,
        unique:    true,
      },
      value: {
        type:      DataTypes.TEXT,
        allowNull: true,
      },
      description: {
        type:      DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'SystemSetting',
      tableName: 'system_settings',
      underscored: true,
    }
  );

  return SystemSetting;
};
