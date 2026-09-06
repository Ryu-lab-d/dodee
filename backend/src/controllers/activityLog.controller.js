const { ActivityLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.findAll({
    order: [['createdAt', 'DESC']],
    limit: 200,
  });
  res.json(logs);
});

module.exports = { list };
