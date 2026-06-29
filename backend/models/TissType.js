'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TissType extends Model {
    static associate(models) {
      TissType.hasMany(models.TissField, {
        foreignKey: 'type_id',
        as: 'fields',
      });
    }
  }

  TissType.init(
    {
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      type: {
        type: DataTypes.ENUM('simple', 'complex'),
        allowNull: false,
        defaultValue: 'simple',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'TissType',
      tableName: 'tiss_types',
      underscored: true,
    }
  );

  return TissType;
};
