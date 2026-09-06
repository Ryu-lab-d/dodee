const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  roomId: { type: DataTypes.UUID, allowNull: false },
  invoiceDate: { type: DataTypes.DATEONLY, allowNull: false },
  billingMonth: { type: DataTypes.STRING, allowNull: false }, // e.g. "2026-09"
  baseRent: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  waterCharge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  electricityCharge: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  otherCharges: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('draft', 'issued', 'paid', 'overdue'),
    allowNull: false,
    defaultValue: 'draft',
  },
  dueDate: { type: DataTypes.DATEONLY, allowNull: false },
}, {
  tableName: 'invoices',
  timestamps: true,
  indexes: [{ unique: true, fields: ['roomId', 'billingMonth'] }],
});

module.exports = Invoice;
