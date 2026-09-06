require('dotenv').config();
const cron = require('node-cron');
const app = require('./app');
const { sequelize } = require('./models');
const { runDailyChecks } = require('./services/notification.service');

const PORT = process.env.PORT || 4000;

const start = async () => {
  try {
    await sequelize.authenticate();
    // Foundation phase: sync schema directly from models. `alter: true` (auto-adjusts
    // existing tables) is only safe in dev - in production it's disabled by default so an
    // unexpected column/index change can't silently rewrite the live schema. Switch to
    // sequelize-cli migrations for real schema change control before this grows much further.
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    console.log('Database connected & synced.');

    // "Every Day at 8 AM" per the contract-expiry / overdue-payment workflow spec.
    cron.schedule('0 8 * * *', () => {
      runDailyChecks()
        .then(({ contractAlerts, overdueAlerts }) =>
          console.log(`[cron] daily checks: ${contractAlerts} contract alerts, ${overdueAlerts} overdue alerts`)
        )
        .catch((err) => console.error('[cron] daily checks failed:', err));
    });

    app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
