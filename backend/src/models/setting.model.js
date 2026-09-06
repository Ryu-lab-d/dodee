const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Small key/value store for things that shouldn't require a redeploy to change,
// e.g. the LINE channel access token.
const Setting = sequelize.define('Setting', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.TEXT },
}, {
  tableName: 'settings',
  timestamps: true,
});

module.exports = Setting;
