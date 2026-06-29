'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Plan extends Model {
    static associate(models) {
      Plan.belongsToMany(models.Tool, {
        through: 'plan_tools',
        foreignKey: 'plan_id',
        as: 'tools',
      });
    }
  }

  Plan.init(
    {
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Plan',
      tableName: 'plans',
      underscored: true,
    }
  );

  return Plan;
};
