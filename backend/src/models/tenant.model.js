const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Tenant = sequelize.define('Tenant', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  roomId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING, validate: { isEmail: true } },
  idCard: { type: DataTypes.STRING },
  moveInDate: { type: DataTypes.DATEONLY },
  contractEndDate: { type: DataTypes.DATEONLY },
  depositAmount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('เช่าอยู่', 'หมดสัญญา', 'ยกเลิก'),
    allowNull: false,
    defaultValue: 'เช่าอยู่',
  },
}, {
  tableName: 'tenants',
  timestamps: true,
});

module.exports = Tenant;
