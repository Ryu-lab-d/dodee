const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Lightweight audit trail: who did what, when - shown on the Staff activity log page.
const ActivityLog = sequelize.define('ActivityLog', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  userName: { type: DataTypes.STRING, allowNull: false },
  action: { type: DataTypes.STRING, allowNull: false }, // e.g. "create_property", "record_payment"
  description: { type: DataTypes.STRING, allowNull: false },
}, {
  tableName: 'activity_logs',
  timestamps: true,
  updatedAt: false,
});

module.exports = ActivityLog;
