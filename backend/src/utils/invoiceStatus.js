const { Op } = require('sequelize');
const { Invoice } = require('../models');
const { toThaiParts } = require('./attendance');

// The business runs on Thailand wall-clock time, not the server process's own timezone
// (Railway defaults to UTC) - see utils/attendance.js for why this shift is needed.
const todayThaiStr = () => toThaiParts(new Date()).dateStr;

// Flips "issued" -> "overdue" for already-loaded invoice rows whose due date has passed,
// mutating them in place so the caller's response reflects the flip immediately.
const applyOverdueStatus = async (invoices) => {
  const today = todayThaiStr();
  const staleIds = invoices.filter((inv) => inv.status === 'issued' && inv.dueDate < today).map((inv) => inv.id);
  if (staleIds.length) {
    await Invoice.update({ status: 'overdue' }, { where: { id: staleIds } });
    invoices.forEach((inv) => {
      if (staleIds.includes(inv.id)) inv.status = 'overdue';
    });
  }
  return invoices;
};

// Same flip, but directly in the DB for a where-scope with no rows loaded yet - for queries
// (like a dashboard count) that only need an accurate status, not the rows themselves. Call
// this before any status-dependent query in the same scope so it reads post-flip data.
const flipStaleInvoices = async (scopeWhere) => {
  await Invoice.update(
    { status: 'overdue' },
    { where: { ...scopeWhere, status: 'issued', dueDate: { [Op.lt]: todayThaiStr() } } }
  );
};

module.exports = { applyOverdueStatus, flipStaleInvoices, todayThaiStr };
