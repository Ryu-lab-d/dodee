const { Setting } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const mask = (value) => (value ? `${value.slice(0, 4)}••••••••${value.slice(-4)}` : null);

const getLineSettings = asyncHandler(async (req, res) => {
  const token = await Setting.findByPk('line_channel_access_token');
  const secret = await Setting.findByPk('line_channel_secret');
  res.json({
    accessTokenConfigured: !!token?.value,
    accessTokenPreview: mask(token?.value),
    channelSecretConfigured: !!secret?.value,
    channelSecretPreview: mask(secret?.value),
  });
});

const updateLineSettings = asyncHandler(async (req, res) => {
  const { accessToken, channelSecret } = req.body;
  if (accessToken) {
    await Setting.upsert({ key: 'line_channel_access_token', value: accessToken });
  }
  if (channelSecret) {
    await Setting.upsert({ key: 'line_channel_secret', value: channelSecret });
  }
  res.status(200).json({ ok: true });
});

const COMPANY_KEYS = ['company_name', 'company_address', 'company_phone', 'company_logo_url'];

const getCompanySettings = asyncHandler(async (req, res) => {
  const rows = await Setting.findAll({ where: { key: COMPANY_KEYS } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({
    name: map.company_name || '',
    address: map.company_address || '',
    phone: map.company_phone || '',
    logoUrl: map.company_logo_url || '',
  });
});

const updateCompanySettings = asyncHandler(async (req, res) => {
  const { name, address, phone, logoUrl } = req.body;
  await Promise.all([
    Setting.upsert({ key: 'company_name', value: name ?? '' }),
    Setting.upsert({ key: 'company_address', value: address ?? '' }),
    Setting.upsert({ key: 'company_phone', value: phone ?? '' }),
    Setting.upsert({ key: 'company_logo_url', value: logoUrl ?? '' }),
  ]);
  res.status(200).json({ ok: true });
});

module.exports = { getLineSettings, updateLineSettings, getCompanySettings, updateCompanySettings };
