const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Join table: which properties a staff/accountant user is assigned to.
const UserProperty = sequelize.define('UserProperty', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  propertyId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'user_properties',
  timestamps: true,
  indexes: [{ unique: true, fields: ['userId', 'propertyId'] }],
});

module.exports = UserProperty;
