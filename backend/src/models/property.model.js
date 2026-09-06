const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Property = sequelize.define('Property', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  type: {
    type: DataTypes.ENUM('หอพัก', 'บ้าน', 'คอนโด'),
    allowNull: false,
    defaultValue: 'หอพัก',
  },
  address: { type: DataTypes.TEXT },
  subdistrict: { type: DataTypes.STRING }, // แขวง/ตำบล
  district: { type: DataTypes.STRING }, // เขต/อำเภอ
  province: { type: DataTypes.STRING },
  postalCode: { type: DataTypes.STRING },
  latitude: { type: DataTypes.DECIMAL(10, 7) },
  longitude: { type: DataTypes.DECIMAL(10, 7) },
  totalRooms: { type: DataTypes.INTEGER, defaultValue: 0 },
  waterRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 50 },
  electricityRate: { type: DataTypes.DECIMAL(10, 2), defaultValue: 7 },
  description: { type: DataTypes.TEXT },
  // Free-form extra info the owner wants to record, e.g. [{ label: "จำนวนชั้น", value: "2 ชั้น" }]
  details: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
  images: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: false, defaultValue: [] },
  ownerId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'properties',
  timestamps: true,
});

module.exports = Property;
