const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MeetingMinute = sequelize.define('MeetingMinute', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING },
  recordedByName: { type: DataTypes.STRING, allowNull: false },
  recordedByUserId: { type: DataTypes.UUID, allowNull: false },
  recordDate: { type: DataTypes.DATEONLY, allowNull: false },
  location: { type: DataTypes.STRING },
  attendees: { type: DataTypes.TEXT },
  content: { type: DataTypes.TEXT, allowNull: false },
  // Free-form extra fields, same [{ label, value }] pattern used on Property/Room.
  details: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  recipientIds: { type: DataTypes.ARRAY(DataTypes.UUID), allowNull: false, defaultValue: [] },
}, {
  tableName: 'meeting_minutes',
  timestamps: true,
});

module.exports = MeetingMinute;
