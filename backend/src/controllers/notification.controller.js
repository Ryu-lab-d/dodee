const { Notification } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { runDailyChecks } = require('../services/notification.service');

const list = asyncHandler(async (req, res) => {
  const notifications = await Notification.findAll({
    where: { userId: req.user.id },
    order: [['sentDate', 'DESC']],
    limit: 50,
  });
  res.json(notifications);
});

const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.count({ where: { userId: req.user.id, readStatus: false } });
  res.json({ count });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  await notification.update({ readStatus: true });
  res.json(notification);
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.update({ readStatus: true }, { where: { userId: req.user.id, readStatus: false } });
  res.status(200).json({ ok: true });
});

// Manual trigger for testing/ops - normally runs on the daily cron schedule.
const runCheck = asyncHandler(async (req, res) => {
  const result = await runDailyChecks();
  res.json(result);
});

module.exports = { list, unreadCount, markRead, markAllRead, runCheck };
