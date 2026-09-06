const { ActivityLog } = require('../models');

// Fire-and-forget: a logging failure should never break the actual request.
const logActivity = (user, action, description) => {
  ActivityLog.create({ userId: user.id, userName: user.name, action, description }).catch((err) =>
    console.error('[activityLog] failed to write:', err.message)
  );
};

module.exports = { logActivity };
