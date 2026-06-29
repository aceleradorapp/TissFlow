'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TissEnum extends Model {
    static associate(models) {
      TissEnum.belongsTo(models.TissField, {
        foreignKey: 'field_id',
        as: 'field',
      });
    }
  }

  TissEnum.init(
    {
      field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      value: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'TissEnum',
      tableName: 'tiss_enums',
      underscored: true,
    }
  );

  return TissEnum;
};
