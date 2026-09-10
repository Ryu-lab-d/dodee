const { Property, Room, Tenant, MeterReading, Invoice, Payment, Transaction, MeetingMinute, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');

// Everything the requesting owner has - scoped the same way /properties already is
// (Property.ownerId === req.user.id), since multiple owner accounts can coexist and each
// should only be able to export their own business's data.
const exportData = asyncHandler(async (req, res) => {
  const properties = await Property.findAll({ where: { ownerId: req.user.id } });
  const propertyIds = properties.map((p) => p.id);

  const rooms = await Room.findAll({ where: { propertyId: propertyIds } });
  const roomIds = rooms.map((r) => r.id);

  const [tenants, meterReadings, invoices, transactions, meetingMinutes, staff] = await Promise.all([
    Tenant.findAll({ where: { roomId: roomIds } }),
    MeterReading.findAll({ where: { roomId: roomIds } }),
    Invoice.findAll({ where: { roomId: roomIds } }),
    Transaction.findAll({ where: { propertyId: propertyIds } }),
    MeetingMinute.findAll(),
    User.findAll({ attributes: ['id', 'username', 'name', 'email', 'phone', 'role', 'status', 'createdAt'] }),
  ]);
  const invoiceIds = invoices.map((i) => i.id);
  const payments = await Payment.findAll({ where: { invoiceId: invoiceIds } });

  logActivity(req.user, 'export_backup', `ดาวน์โหลดข้อมูลสำรอง (${properties.length} ทรัพย์สิน)`);

  res.json({
    exportedAt: new Date().toISOString(),
    properties,
    rooms,
    tenants,
    meterReadings,
    invoices,
    payments,
    transactions,
    meetingMinutes,
    staff,
  });
});

module.exports = { exportData };
