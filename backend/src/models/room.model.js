const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Room = sequelize.define('Room', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  propertyId: { type: DataTypes.UUID, allowNull: false },
  roomNumber: { type: DataTypes.STRING, allowNull: false },
  roomType: { type: DataTypes.STRING, defaultValue: 'ห้องพัก' },
  baseRentPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('ว่าง', 'ไม่ว่าง', 'ซ่อม'),
    allowNull: false,
    defaultValue: 'ว่าง',
  },
  meterWaterInitial: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  meterElectricityInitial: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  description: { type: DataTypes.TEXT },
  details: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  images: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },
}, {
  tableName: 'rooms',
  timestamps: true,
  indexes: [{ unique: true, fields: ['propertyId', 'roomNumber'] }],
});

module.exports = Room;
