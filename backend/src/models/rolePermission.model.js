const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Per-role permission matrix for non-owner roles. Owner always has full access
// (checked in code, never stored here) so it can never be locked out via this table.
const RolePermission = sequelize.define('RolePermission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  role: { type: DataTypes.ENUM('admin', 'manager'), allowNull: false, unique: true },
  permissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, {
  tableName: 'role_permissions',
  timestamps: true,
});

module.exports = RolePermission;
