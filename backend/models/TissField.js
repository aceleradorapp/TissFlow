'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TissField extends Model {
    static associate(models) {
      TissField.belongsTo(models.TissType, {
        foreignKey: 'type_id',
        as: 'tissType',
      });

      TissField.belongsTo(models.TissVersion, {
        foreignKey: 'version_id',
        as: 'version',
      });

      // Auto-referência: hierarquia pai → filho
      TissField.belongsTo(models.TissField, {
        foreignKey: 'parent_id',
        as: 'parent',
      });

      TissField.hasMany(models.TissField, {
        foreignKey: 'parent_id',
        as: 'children',
      });

      TissField.hasMany(models.TissEnum, {
        foreignKey: 'field_id',
        as: 'enums',
      });
    }
  }

  TissField.init(
    {
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      type_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      version_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      min_occurs: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      max_occurs: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      min_length: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      max_length: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      pattern_regex: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      xpath: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'TissField',
      tableName: 'tiss_fields',
      underscored: true,
    }
  );

  return TissField;
};
