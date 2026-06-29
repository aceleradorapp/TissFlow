'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TissVersionChange extends Model {
    static associate() {}
  }

  TissVersionChange.init(
    {
      source_version: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      target_version: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      guia_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      xpath: {
        type: DataTypes.STRING(600),
        allowNull: false,
      },
      field_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      change_type: {
        type: DataTypes.ENUM('ADD', 'REMOVED', 'MODIFIED'),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'TissVersionChange',
      tableName: 'tiss_version_changes',
      underscored: true,
    }
  );

  return TissVersionChange;
};
