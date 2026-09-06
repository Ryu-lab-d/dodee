const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MeterReading = sequelize.define('MeterReading', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  roomId: { type: DataTypes.UUID, allowNull: false },
  readingDate: { type: DataTypes.DATEONLY, allowNull: false },
  waterPrevious: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  waterCurrent: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  electricityPrevious: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  electricityCurrent: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  waterUnitUsed: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  electricityUnitUsed: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  meterImageUrl: { type: DataTypes.STRING },
  ocrStatus: {
    type: DataTypes.ENUM('Manual', 'Scanned'),
    allowNull: false,
    defaultValue: 'Manual',
  },
  recordedBy: { type: DataTypes.UUID },
}, {
  tableName: 'meter_readings',
  timestamps: true,
});

module.exports = MeterReading;
