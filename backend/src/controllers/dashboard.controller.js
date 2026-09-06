const { Op, fn, col } = require('sequelize');
const { Property, Room, Tenant, Invoice, Transaction, UserProperty } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const scopeForUser = async (user) => {
  if (user.role === 'owner') return { ownerId: user.id };
  const assignments = await UserProperty.findAll({ where: { userId: user.id } });
  return { id: assignments.map((a) => a.propertyId) };
};

const summary = asyncHandler(async (req, res) => {
  const propertyWhere = await scopeForUser(req.user);
  const properties = await Property.findAll({ where: propertyWhere, attributes: ['id'] });
  const propertyIds = properties.map((p) => p.id);

  const rooms = await Room.findAll({ where: { propertyId: propertyIds }, attributes: ['id', 'status'] });
  const roomIds = rooms.map((r) => r.id);

  const activeTenants = await Tenant.count({ where: { roomId: roomIds, status: 'เช่าอยู่' } });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthIncome = await Transaction.sum('amount', {
    where: {
      propertyId: propertyIds,
      type: 'income',
      date: { [Op.gte]: monthStart },
    },
  });

  const overdueCount = await Invoice.count({
    where: { roomId: roomIds, status: 'overdue' },
  });

  const recentTransactions = await Transaction.findAll({
    where: { propertyId: propertyIds },
    order: [['date', 'DESC']],
    limit: 10,
  });

  res.json({
    totalProperties: propertyIds.length,
    activeTenants,
    monthIncome: monthIncome || 0,
    overdueInvoices: overdueCount,
    roomStatus: {
      total: rooms.length,
      occupied: rooms.filter((r) => r.status === 'ไม่ว่าง').length,
      vacant: rooms.filter((r) => r.status === 'ว่าง').length,
      maintenance: rooms.filter((r) => r.status === 'ซ่อม').length,
    },
    recentTransactions,
  });
});

module.exports = { summary };
