const { ActivityLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.userId) where.userId = req.query.userId;
  const limit = Math.min(Number(req.query.limit) || 200, 500);

  const logs = await ActivityLog.findAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
  });
  res.json(logs);
});

module.exports = { list };
