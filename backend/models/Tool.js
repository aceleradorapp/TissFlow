'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tool extends Model {
    static associate(models) {
      Tool.belongsToMany(models.Plan, {
        through:    'plan_tools',
        foreignKey: 'tool_id',
        as:         'plans',
      });
      Tool.belongsToMany(models.User, {
        through:    'user_features',
        foreignKey: 'tool_id',
        otherKey:   'user_id',
        as:         'addonUsers',
      });
    }
  }

  Tool.init(
    {
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
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
      modelName: 'Tool',
      tableName: 'tools',
      underscored: true,
    }
  );

  return Tool;
};
