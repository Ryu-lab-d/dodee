const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM('income', 'expense'), allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false }, // rent/water/electricity/repair/etc
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.STRING },
  propertyId: { type: DataTypes.UUID, allowNull: false },
  recordedBy: { type: DataTypes.UUID },
}, {
  tableName: 'transactions',
  timestamps: true,
});

module.exports = Transaction;
