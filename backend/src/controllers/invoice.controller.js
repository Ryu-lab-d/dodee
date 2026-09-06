const { Invoice, Room, Property, Tenant, MeterReading, UserProperty, Payment } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');

const DUE_DAYS = Number(process.env.INVOICE_DUE_DAYS || 10);

const propertyIdsForUser = async (user) => {
  if (user.role === 'owner') {
    const properties = await Property.findAll({ where: { ownerId: user.id }, attributes: ['id'] });
    return properties.map((p) => p.id);
  }
  const assignments = await UserProperty.findAll({ where: { userId: user.id } });
  return assignments.map((a) => a.propertyId);
};

// Flip issued invoices whose due date has passed to "overdue" before returning them.
const applyOverdueStatus = async (invoices) => {
  const today = new Date().toISOString().slice(0, 10);
  const staleIds = invoices.filter((inv) => inv.status === 'issued' && inv.dueDate < today).map((inv) => inv.id);
  if (staleIds.length) {
    await Invoice.update({ status: 'overdue' }, { where: { id: staleIds } });
    invoices.forEach((inv) => {
      if (staleIds.includes(inv.id)) inv.status = 'overdue';
    });
  }
  return invoices;
};

const list = asyncHandler(async (req, res) => {
  const propertyIds = await propertyIdsForUser(req.user);
  const rooms = await Room.findAll({ where: { propertyId: propertyIds }, attributes: ['id'] });
  const roomIds = rooms.map((r) => r.id);

  const where = { roomId: req.query.roomId || roomIds };
  if (req.query.status) where.status = req.query.status;
  if (req.query.billingMonth) where.billingMonth = req.query.billingMonth;

  const invoices = await Invoice.findAll({
    where,
    include: [
      { model: Room, as: 'room', include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }] },
      { model: Payment, as: 'payments' },
    ],
    order: [['invoiceDate', 'DESC']],
  });

  res.json(await applyOverdueStatus(invoices));
});

const getOne = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findByPk(req.params.id, {
    include: [
      { model: Room, as: 'room', include: [{ model: Property, as: 'property' }, { model: Tenant, as: 'tenants' }] },
      { model: Payment, as: 'payments' },
    ],
  });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  const [withStatus] = await applyOverdueStatus([invoice]);
  res.json(withStatus);
});

// Module 3: pull the month's meter readings, add base rent + other charges, create one invoice per room.
const generate = asyncHandler(async (req, res) => {
  const { billingMonth, propertyId, otherCharges = {} } = req.body;
  if (!billingMonth) return res.status(400).json({ message: 'billingMonth is required (YYYY-MM)' });

  const propertyIds = await propertyIdsForUser(req.user);
  const scopedPropertyIds = propertyId ? propertyIds.filter((id) => id === propertyId) : propertyIds;

  const rooms = await Room.findAll({ where: { propertyId: scopedPropertyIds }, include: [{ model: Property, as: 'property' }] });

  const created = [];
  const skipped = [];

  for (const room of rooms) {
    const existing = await Invoice.findOne({ where: { roomId: room.id, billingMonth } });
    if (existing) {
      skipped.push({ roomId: room.id, reason: 'มีใบเรียกเก็บของเดือนนี้แล้ว' });
      continue;
    }

    const readings = await MeterReading.findAll({ where: { roomId: room.id } });
    const reading = readings
      .filter((r) => r.readingDate.slice(0, 7) === billingMonth)
      .sort((a, b) => (a.readingDate < b.readingDate ? 1 : -1))[0];

    if (!reading) {
      skipped.push({ roomId: room.id, reason: 'ยังไม่มีการจดมิเตอร์ของเดือนนี้' });
      continue;
    }

    const waterCharge = Number(reading.waterUnitUsed) * Number(room.property.waterRate);
    const electricityCharge = Number(reading.electricityUnitUsed) * Number(room.property.electricityRate);
    const extra = Number(otherCharges[room.id] || 0);
    const baseRent = Number(room.baseRentPrice);
    const totalAmount = baseRent + waterCharge + electricityCharge + extra;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + DUE_DAYS);

    const invoice = await Invoice.create({
      roomId: room.id,
      invoiceDate: new Date().toISOString().slice(0, 10),
      billingMonth,
      baseRent,
      waterCharge,
      electricityCharge,
      otherCharges: extra,
      totalAmount,
      status: 'issued',
      dueDate: dueDate.toISOString().slice(0, 10),
    });

    created.push(invoice);
  }

  logActivity(req.user, 'generate_invoices', `สร้างใบเรียกเก็บงวด ${billingMonth} จำนวน ${created.length} ใบ`);
  res.status(201).json({ created, skipped });
});

module.exports = { list, getOne, generate };
