const { Sequelize } = require('sequelize');
require('dotenv').config();

// Hosted Postgres (Railway, Render, etc.) typically provides one DATABASE_URL connection
// string instead of separate host/user/password vars - support both so the same code runs
// locally (docker-compose) and in production.
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions:
        process.env.DATABASE_SSL === 'true'
          ? { ssl: { require: true, rejectUnauthorized: false } }
          : {},
    })
  : new Sequelize(
      process.env.DB_NAME || 'dodee',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
      }
    );

module.exports = sequelize;
