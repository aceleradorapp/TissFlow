'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TissVersion extends Model {
    static associate(models) {
      TissVersion.hasMany(models.TissField, {
        foreignKey: 'version_id',
        as: 'fields',
      });
    }
  }

  TissVersion.init(
    {
      version: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },
      release_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'TissVersion',
      tableName: 'tiss_versions',
      underscored: true,
    }
  );

  return TissVersion;
};
