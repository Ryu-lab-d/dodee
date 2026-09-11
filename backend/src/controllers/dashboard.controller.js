const { Op } = require('sequelize');
const { Property, Room, Tenant, Invoice, Transaction, UserProperty, MeterReading } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const scopeForUser = async (user) => {
  if (user.role === 'owner') return { ownerId: user.id };
  const assignments = await UserProperty.findAll({ where: { userId: user.id } });
  return { id: assignments.map((a) => a.propertyId) };
};

const toDateStr = (d) => d.toISOString().slice(0, 10);
const monthKey = (d) => d.toISOString().slice(0, 7);

const roomLabel = (room) => (room?.roomNumber === 'หลัก' ? room?.property?.name : `${room?.property?.name || ''} ห้อง ${room?.roomNumber || ''}`);

const summary = asyncHandler(async (req, res) => {
  const propertyWhere = await scopeForUser(req.user);
  const properties = await Property.findAll({ where: propertyWhere, attributes: ['id'] });
  const propertyIds = properties.map((p) => p.id);

  const rooms = await Room.findAll({ where: { propertyId: propertyIds }, attributes: ['id', 'status'] });
  const roomIds = rooms.map((r) => r.id);

  const activeTenants = await Tenant.count({ where: { roomId: roomIds, status: 'เช่าอยู่' } });

  const now = new Date();
  const monthStartStr = toDateStr(new Date(now.getFullYear(), now.getMonth(), 1));

  const [monthIncome, monthExpense] = await Promise.all([
    Transaction.sum('amount', { where: { propertyId: propertyIds, type: 'income', date: { [Op.gte]: monthStartStr } } }),
    Transaction.sum('amount', { where: { propertyId: propertyIds, type: 'expense', date: { [Op.gte]: monthStartStr } } }),
  ]);

  const overdueCount = await Invoice.count({
    where: { roomId: roomIds, status: 'overdue' },
  });

  const recentTransactions = await Transaction.findAll({
    where: { propertyId: propertyIds },
    order: [['date', 'DESC']],
    limit: 10,
  });

  // 6-month income/expense trend, oldest to newest, this month included.
  const trendStartStr = toDateStr(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const trendTransactions = await Transaction.findAll({
    where: { propertyId: propertyIds, date: { [Op.gte]: trendStartStr } },
    attributes: ['type', 'amount', 'date'],
  });
  const trendMap = new Map();
  for (let i = 5; i >= 0; i -= 1) {
    const key = monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
    trendMap.set(key, { month: key, income: 0, expense: 0 });
  }
  for (const t of trendTransactions) {
    const bucket = trendMap.get(String(t.date).slice(0, 7));
    if (bucket) bucket[t.type] += Number(t.amount);
  }

  // Rooms with no meter reading logged yet this month.
  const readingsThisMonth = await MeterReading.findAll({
    where: { roomId: roomIds, readingDate: { [Op.gte]: monthStartStr } },
    attributes: ['roomId'],
  });
  const roomsRead = new Set(readingsThisMonth.map((r) => r.roomId));
  const pendingMeterReadings = roomIds.length - roomsRead.size;

  // Actionable items in the next 14 days - what needs a decision soon, not just calendar noise.
  const todayStr = toDateStr(now);
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 14);
  const horizonStr = toDateStr(horizon);

  const [endingSoon, invoicesDueSoon] = await Promise.all([
    Tenant.findAll({
      where: { contractEndDate: { [Op.between]: [todayStr, horizonStr] }, status: 'เช่าอยู่' },
      include: [
        {
          model: Room,
          as: 'room',
          required: true,
          where: { propertyId: propertyIds },
          include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }],
        },
      ],
      order: [['contractEndDate', 'ASC']],
      limit: 5,
    }),
    Invoice.findAll({
      where: { roomId: roomIds, status: { [Op.in]: ['issued', 'overdue'] }, dueDate: { [Op.lte]: horizonStr } },
      include: [
        {
          model: Room,
          as: 'room',
          required: true,
          include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }],
        },
      ],
      order: [['dueDate', 'ASC']],
      limit: 5,
    }),
  ]);

  res.json({
    totalProperties: propertyIds.length,
    activeTenants,
    monthIncome: monthIncome || 0,
    monthExpense: monthExpense || 0,
    profit: (monthIncome || 0) - (monthExpense || 0),
    overdueInvoices: overdueCount,
    pendingMeterReadings: Math.max(0, pendingMeterReadings),
    roomStatus: {
      total: rooms.length,
      occupied: rooms.filter((r) => r.status === 'ไม่ว่าง').length,
      vacant: rooms.filter((r) => r.status === 'ว่าง').length,
      maintenance: rooms.filter((r) => r.status === 'ซ่อม').length,
    },
    recentTransactions,
    trend: Array.from(trendMap.values()),
    upcomingContracts: endingSoon.map((t) => ({
      id: t.id,
      tenantName: t.name,
      contractEndDate: t.contractEndDate,
      roomLabel: roomLabel(t.room),
    })),
    upcomingInvoices: invoicesDueSoon.map((inv) => ({
      id: inv.id,
      dueDate: inv.dueDate,
      totalAmount: inv.totalAmount,
      status: inv.status,
      roomLabel: roomLabel(inv.room),
    })),
  });
});

module.exports = { summary };
