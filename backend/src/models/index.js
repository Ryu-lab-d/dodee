const sequelize = require('../config/db');
const User = require('./user.model');
const Property = require('./property.model');
const Room = require('./room.model');
const Tenant = require('./tenant.model');
const MeterReading = require('./meterReading.model');
const Invoice = require('./invoice.model');
const Payment = require('./payment.model');
const Transaction = require('./transaction.model');
const Notification = require('./notification.model');
const UserProperty = require('./userProperty.model');
const Setting = require('./setting.model');
const MeetingMinute = require('./meetingMinute.model');
const ActivityLog = require('./activityLog.model');

// Property <-> Room
Property.hasMany(Room, { foreignKey: 'propertyId', as: 'rooms', onDelete: 'CASCADE' });
Room.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// Property <-> User (owner)
User.hasMany(Property, { foreignKey: 'ownerId', as: 'ownedProperties' });
Property.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// User <-> Property (assigned, many-to-many via UserProperty)
User.belongsToMany(Property, { through: UserProperty, foreignKey: 'userId', otherKey: 'propertyId', as: 'assignedProperties' });
Property.belongsToMany(User, { through: UserProperty, foreignKey: 'propertyId', otherKey: 'userId', as: 'assignedUsers' });

// Room <-> Tenant (current + historical tenants of a room)
Room.hasMany(Tenant, { foreignKey: 'roomId', as: 'tenants' });
Tenant.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

// Room <-> MeterReading
Room.hasMany(MeterReading, { foreignKey: 'roomId', as: 'meterReadings', onDelete: 'CASCADE' });
MeterReading.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

// Room <-> Invoice
Room.hasMany(Invoice, { foreignKey: 'roomId', as: 'invoices', onDelete: 'CASCADE' });
Invoice.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

// Invoice <-> Payment
Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Property <-> Transaction
Property.hasMany(Transaction, { foreignKey: 'propertyId', as: 'transactions', onDelete: 'CASCADE' });
Transaction.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// User <-> MeetingMinute (who recorded it)
User.hasMany(MeetingMinute, { foreignKey: 'recordedByUserId', as: 'meetingMinutes' });
MeetingMinute.belongsTo(User, { foreignKey: 'recordedByUserId', as: 'recordedByUser' });

module.exports = {
  sequelize,
  User,
  Property,
  Room,
  Tenant,
  MeterReading,
  Invoice,
  Payment,
  Transaction,
  Notification,
  UserProperty,
  Setting,
  MeetingMinute,
  ActivityLog,
};
