const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// One row per (user, Thai calendar day). "Checked in and not yet checked out" is what
// grants a non-owner user access to the rest of the app for that day - see utils/attendance.js.
const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false }, // Thai calendar day, e.g. "2026-09-09"

  checkInAt: { type: DataTypes.DATE },
  checkInLateMinutes: { type: DataTypes.INTEGER },
  checkInMethod: { type: DataTypes.ENUM('normal', 'override') },

  checkOutAt: { type: DataTypes.DATE },
  checkOutEarly: { type: DataTypes.BOOLEAN, defaultValue: false },
  checkOutEarlyMinutes: { type: DataTypes.INTEGER },

  // Populated only when checkInMethod/re-entry method is 'override' (accessing data
  // outside the normal check-in window) - the reason + signed agreement for that access.
  overrideReason: { type: DataTypes.TEXT },
  overrideSignatureUrl: { type: DataTypes.STRING },
}, {
  tableName: 'attendances',
  timestamps: true,
  indexes: [{ unique: true, fields: ['userId', 'date'] }],
});

module.exports = Attendance;
