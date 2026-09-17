const { Invoice, Room, Property, Tenant, MeterReading, UserProperty, Payment } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');
const { applyOverdueStatus } = require('../utils/invoiceStatus');

const DUE_DAYS = Number(process.env.INVOICE_DUE_DAYS || 10);

const propertyIdsForUser = async (user) => {
  if (user.role === 'owner') {
    const properties = await Property.findAll({ where: { ownerId: user.id }, attributes: ['id'] });
    return properties.map((p) => p.id);
  }
  const assignments = await UserProperty.findAll({ where: { userId: user.id } });
  return assignments.map((a) => a.propertyId);
};

const defaultDueDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + DUE_DAYS);
  return d.toISOString().slice(0, 10);
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
  const propertyIds = await propertyIdsForUser(req.user);
  if (!invoice || !propertyIds.includes(invoice.room?.propertyId)) {
    return res.status(404).json({ message: 'Invoice not found' });
  }
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
      dueDate: defaultDueDate(),
    });

    created.push(invoice);
  }

  logActivity(req.user, 'generate_invoices', `สร้างใบเรียกเก็บงวด ${billingMonth} จำนวน ${created.length} ใบ`);
  res.status(201).json({ created, skipped });
});

// Manual single-invoice creation - for charges "สร้างใบเรียกเก็บของเดือนนี้" can't cover
// (a room with no meter reading yet, a one-off repair/extra charge, a negotiated rent).
// Still bound by the same one-invoice-per-room-per-month rule as generate (DB unique index
// on roomId+billingMonth), so this fills in a missing month rather than adding a second bill.
const create = asyncHandler(async (req, res) => {
  const { roomId, billingMonth, invoiceDate, dueDate, baseRent, waterCharge, electricityCharge, otherCharges } = req.body;
  if (!roomId || !billingMonth) {
    return res.status(400).json({ message: 'roomId และ billingMonth จำเป็นต้องกรอก' });
  }

  const room = await Room.findByPk(roomId);
  const propertyIds = await propertyIdsForUser(req.user);
  if (!room || !propertyIds.includes(room.propertyId)) {
    return res.status(404).json({ message: 'Room not found' });
  }

  const existing = await Invoice.findOne({ where: { roomId, billingMonth } });
  if (existing) {
    return res.status(409).json({ message: 'ห้องนี้มีใบเรียกเก็บของเดือนนี้อยู่แล้ว' });
  }

  const base = Number(baseRent || 0);
  const water = Number(waterCharge || 0);
  const electricity = Number(electricityCharge || 0);
  const extra = Number(otherCharges || 0);
  if (base < 0 || water < 0 || electricity < 0 || extra < 0) {
    return res.status(400).json({ message: 'แต่ละรายการต้องไม่ติดลบ' });
  }
  const totalAmount = base + water + electricity + extra;
  if (totalAmount <= 0) {
    return res.status(400).json({ message: 'ยอดรวมต้องมากกว่า 0 บาท' });
  }

  const invoice = await Invoice.create({
    roomId,
    invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
    billingMonth,
    baseRent: base,
    waterCharge: water,
    electricityCharge: electricity,
    otherCharges: extra,
    totalAmount,
    status: 'issued',
    dueDate: dueDate || defaultDueDate(),
  });

  logActivity(req.user, 'create_invoice', `สร้างใบเรียกเก็บด้วยตนเอง ห้อง ${room.roomNumber} งวด ${billingMonth} ฿${totalAmount.toLocaleString()}`);
  res.status(201).json(invoice);
});

module.exports = { list, getOne, generate, create };
