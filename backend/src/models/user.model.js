const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, validate: { isEmail: true } },
  phone: { type: DataTypes.STRING },
  role: {
    type: DataTypes.ENUM('owner', 'staff', 'accountant'),
    allowNull: false,
    defaultValue: 'staff',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    allowNull: false,
    defaultValue: 'active',
  },
  lineUserId: { type: DataTypes.STRING, unique: true },
  lineLinkCode: { type: DataTypes.STRING, unique: true },
  termsAcceptedAt: { type: DataTypes.DATE },
  termsVersion: { type: DataTypes.STRING },
  termsSignatureUrl: { type: DataTypes.STRING },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = User;
