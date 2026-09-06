const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  invoiceId: { type: DataTypes.UUID, allowNull: false },
  paymentDate: { type: DataTypes.DATEONLY, allowNull: false },
  amountPaid: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  paymentMethod: {
    type: DataTypes.ENUM('bank_transfer', 'qr', 'cash'),
    allowNull: false,
  },
  paymentReference: { type: DataTypes.STRING },
  recordedBy: { type: DataTypes.UUID },
  transactionId: { type: DataTypes.UUID },
}, {
  tableName: 'payments',
  timestamps: true,
});

module.exports = Payment;
