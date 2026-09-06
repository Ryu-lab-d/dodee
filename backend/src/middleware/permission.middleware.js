const { hasPermission } = require('../utils/permissions');

// Like role.middleware's authorize(), but checks the dynamic per-role permission
// matrix instead of a hardcoded role list. Owner always passes (see hasPermission).
const requirePermission = (key) => async (req, res, next) => {
  if (await hasPermission(req.user, key)) return next();
  res.status(403).json({ message: 'Forbidden: insufficient permission' });
};

module.exports = requirePermission;
