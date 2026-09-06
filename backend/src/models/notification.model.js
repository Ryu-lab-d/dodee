const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  type: {
    type: DataTypes.ENUM('contract_expiring', 'payment_overdue', 'repair_request'),
    allowNull: false,
  },
  message: { type: DataTypes.STRING, allowNull: false },
  sentVia: { type: DataTypes.ENUM('app', 'line'), allowNull: false, defaultValue: 'app' },
  sentDate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  readStatus: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // What triggered this notification, so the daily check can avoid creating duplicates.
  referenceType: { type: DataTypes.ENUM('tenant', 'invoice'), allowNull: true },
  referenceId: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'notifications',
  timestamps: true,
});

module.exports = Notification;
