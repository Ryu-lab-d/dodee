const { Op } = require('sequelize');
const { Property, Room, Tenant, Invoice, Transaction, UserProperty, MeterReading } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { toThaiParts } = require('../utils/attendance');
const { flipStaleInvoices } = require('../utils/invoiceStatus');

const scopeForUser = async (user) => {
  if (user.role === 'owner') return { ownerId: user.id };
  const assignments = await UserProperty.findAll({ where: { userId: user.id } });
  return { id: assignments.map((a) => a.propertyId) };
};

const roomLabel = (room) => (room?.roomNumber === 'หลัก' ? room?.property?.name : `${room?.property?.name || ''} ห้อง ${room?.roomNumber || ''}`);

// month is 1-indexed (1-12). Shifts by `delta` months (may be negative) via UTC calendar
// math only - this never reads "now" from it, so it's safe regardless of server timezone.
const shiftMonth = (year, month, delta) => {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
};
const monthStartStr = ({ year, month }) => `${year}-${String(month).padStart(2, '0')}-01`;
const monthKeyOf = ({ year, month }) => `${year}-${String(month).padStart(2, '0')}`;

const summary = asyncHandler(async (req, res) => {
  const propertyWhere = await scopeForUser(req.user);
  const properties = await Property.findAll({ where: propertyWhere, attributes: ['id'] });
  const propertyIds = properties.map((p) => p.id);

  const rooms = await Room.findAll({ where: { propertyId: propertyIds }, attributes: ['id', 'status'] });
  const roomIds = rooms.map((r) => r.id);

  // All "today"/month-boundary math below runs on Thailand wall-clock time, not the server
  // process's own timezone (Railway defaults to UTC) - see utils/attendance.js. Using the
  // server's raw local getters here would occasionally put "today" or "this month" a day
  // off from the Thai calendar day depending on the time of day in UTC.
  const { dateStr: todayStr } = toThaiParts(new Date());
  const [todayYear, todayMonth] = todayStr.split('-').map(Number);
  const thisMonth = { year: todayYear, month: todayMonth };
  const thisMonthStartStr = monthStartStr(thisMonth);
  const trendStartStr = monthStartStr(shiftMonth(todayYear, todayMonth, -5));
  const horizonStr = toThaiParts(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)).dateStr;

  // Lazily flip any "issued" invoice whose due date has passed before the queries below run,
  // the same rule the Invoices page applies on load - otherwise this summary can show a
  // stale "issued" badge/undercount overdue invoices whenever nobody's opened that page
  // recently to trigger the flip themselves.
  await flipStaleInvoices({ roomId: roomIds });

  const [
    activeTenants,
    monthIncome,
    monthExpense,
    overdueCount,
    recentTransactions,
    trendTransactions,
    readingsThisMonth,
    endingSoon,
    invoicesDueSoon,
  ] = await Promise.all([
    Tenant.count({ where: { roomId: roomIds, status: 'เช่าอยู่' } }),
    Transaction.sum('amount', { where: { propertyId: propertyIds, type: 'income', date: { [Op.gte]: thisMonthStartStr } } }),
    Transaction.sum('amount', { where: { propertyId: propertyIds, type: 'expense', date: { [Op.gte]: thisMonthStartStr } } }),
    Invoice.count({ where: { roomId: roomIds, status: 'overdue' } }),
    Transaction.findAll({ where: { propertyId: propertyIds }, order: [['date', 'DESC']], limit: 10 }),
    Transaction.findAll({
      where: { propertyId: propertyIds, date: { [Op.gte]: trendStartStr } },
      attributes: ['type', 'amount', 'date'],
    }),
    MeterReading.findAll({ where: { roomId: roomIds, readingDate: { [Op.gte]: thisMonthStartStr } }, attributes: ['roomId'] }),
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

  // 6-month income/expense trend, oldest to newest, this month included.
  const trendMap = new Map();
  for (let i = 5; i >= 0; i -= 1) {
    const key = monthKeyOf(shiftMonth(todayYear, todayMonth, -i));
    trendMap.set(key, { month: key, income: 0, expense: 0 });
  }
  for (const t of trendTransactions) {
    const bucket = trendMap.get(String(t.date).slice(0, 7));
    if (bucket) bucket[t.type] += Number(t.amount);
  }

  // Rooms with no meter reading logged yet this month.
  const roomsRead = new Set(readingsThisMonth.map((r) => r.roomId));
  const pendingMeterReadings = roomIds.length - roomsRead.size;

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
