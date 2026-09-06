const { Op } = require('sequelize');
const { Transaction, Property, UserProperty } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const propertyIdsForUser = async (user) => {
  if (user.role === 'owner') {
    const properties = await Property.findAll({ where: { ownerId: user.id }, attributes: ['id'] });
    return properties.map((p) => p.id);
  }
  const assignments = await UserProperty.findAll({ where: { userId: user.id } });
  return assignments.map((a) => a.propertyId);
};

const dateRangeWhere = (req) => {
  const where = {};
  if (req.query.from || req.query.to) {
    where.date = {};
    if (req.query.from) where.date[Op.gte] = req.query.from;
    if (req.query.to) where.date[Op.lte] = req.query.to;
  }
  if (req.query.month) {
    const [year, month] = req.query.month.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
    where.date = { [Op.gte]: `${req.query.month}-01`, [Op.lte]: `${req.query.month}-${String(lastDay).padStart(2, '0')}` };
  }
  return where;
};

const list = asyncHandler(async (req, res) => {
  const propertyIds = await propertyIdsForUser(req.user);
  const where = {
    propertyId: req.query.propertyId ? [req.query.propertyId] : propertyIds,
    ...dateRangeWhere(req),
  };
  if (req.query.type) where.type = req.query.type;

  const transactions = await Transaction.findAll({
    where,
    include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }],
    order: [['date', 'DESC'], ['createdAt', 'DESC']],
  });
  res.json(transactions);
});

// P&L summary: totals by type and a category breakdown, for a date range/property.
const summary = asyncHandler(async (req, res) => {
  const propertyIds = await propertyIdsForUser(req.user);
  const where = {
    propertyId: req.query.propertyId ? [req.query.propertyId] : propertyIds,
    ...dateRangeWhere(req),
  };

  const transactions = await Transaction.findAll({ where });

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  const byCategory = {};
  for (const t of transactions) {
    const key = `${t.type}:${t.category}`;
    byCategory[key] = (byCategory[key] || 0) + Number(t.amount);
  }

  res.json({
    totalIncome,
    totalExpense,
    profit: totalIncome - totalExpense,
    byCategory: Object.entries(byCategory).map(([key, amount]) => {
      const [type, category] = key.split(':');
      return { type, category, amount };
    }),
  });
});

// Manual entries only - payments already auto-create "rent" income transactions.
const create = asyncHandler(async (req, res) => {
  const { type, category, amount, date, description, propertyId } = req.body;
  if (!type || !category || !amount || !date || !propertyId) {
    return res.status(400).json({ message: 'type, category, amount, date และ propertyId จำเป็นต้องกรอก' });
  }
  const propertyIds = await propertyIdsForUser(req.user);
  if (!propertyIds.includes(propertyId)) {
    return res.status(404).json({ message: 'Property not found' });
  }

  const transaction = await Transaction.create({
    type, category, amount, date, description, propertyId, recordedBy: req.user.id,
  });
  res.status(201).json(transaction);
});

const update = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByPk(req.params.id);
  const propertyIds = await propertyIdsForUser(req.user);
  if (!transaction || !propertyIds.includes(transaction.propertyId)) {
    return res.status(404).json({ message: 'Transaction not found' });
  }

  const { type, category, amount, date, description } = req.body;
  await transaction.update({ type, category, amount, date, description });
  res.json(transaction);
});

const remove = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findByPk(req.params.id);
  const propertyIds = await propertyIdsForUser(req.user);
  if (!transaction || !propertyIds.includes(transaction.propertyId)) {
    return res.status(404).json({ message: 'Transaction not found' });
  }
  await transaction.destroy();
  res.status(204).send();
});

module.exports = { list, summary, create, update, remove };
