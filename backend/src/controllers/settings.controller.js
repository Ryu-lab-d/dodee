const { Setting } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const lineService = require('../services/line.service');

const mask = (value) => (value ? `${value.slice(0, 4)}••••••••${value.slice(-4)}` : null);

const getLineSettings = asyncHandler(async (req, res) => {
  const token = await Setting.findByPk('line_channel_access_token');
  const secret = await Setting.findByPk('line_channel_secret');
  const accessTokenConfigured = !!token?.value;
  const channelSecretConfigured = !!secret?.value;
  res.json({
    accessTokenConfigured,
    accessTokenPreview: mask(token?.value),
    channelSecretConfigured,
    channelSecretPreview: mask(secret?.value),
    // Once both are set, the settings page locks them behind an explicit "unlock to
    // edit" confirmation - accidentally overtyping a working config was the most
    // likely way this silently broke before.
    locked: accessTokenConfigured && channelSecretConfigured,
  });
});

const updateLineSettings = asyncHandler(async (req, res) => {
  const { accessToken, channelSecret, confirmChange } = req.body;
  const trimmedToken = accessToken?.trim() || null;
  const trimmedSecret = channelSecret?.trim() || null;

  const existingToken = await Setting.findByPk('line_channel_access_token');
  const existingSecret = await Setting.findByPk('line_channel_secret');
  const alreadyLocked = !!existingToken?.value && !!existingSecret?.value;

  if (alreadyLocked && !confirmChange) {
    return res.status(409).json({
      message: 'ตั้งค่า LINE ไว้แล้วและถูกล็อกไว้ กรุณากด "แก้ไข" และยืนยันก่อนเปลี่ยนแปลง',
    });
  }

  if (trimmedToken) {
    const validation = await lineService.validateAccessToken(trimmedToken);
    if (!validation.ok) {
      return res.status(400).json({ message: `Channel Access Token ไม่ถูกต้อง: ${validation.error}` });
    }
    await Setting.upsert({ key: 'line_channel_access_token', value: trimmedToken });
  }
  if (trimmedSecret) {
    await Setting.upsert({ key: 'line_channel_secret', value: trimmedSecret });
  }
  res.status(200).json({ ok: true });
});

const COMPANY_KEYS = ['company_name', 'company_address', 'company_phone', 'company_logo_url', 'company_promptpay_id'];

const getCompanySettings = asyncHandler(async (req, res) => {
  const rows = await Setting.findAll({ where: { key: COMPANY_KEYS } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({
    name: map.company_name || '',
    address: map.company_address || '',
    phone: map.company_phone || '',
    logoUrl: map.company_logo_url || '',
    promptpayId: map.company_promptpay_id || '',
  });
});

const updateCompanySettings = asyncHandler(async (req, res) => {
  const { name, address, phone, logoUrl, promptpayId } = req.body;
  await Promise.all([
    Setting.upsert({ key: 'company_name', value: name ?? '' }),
    Setting.upsert({ key: 'company_address', value: address ?? '' }),
    Setting.upsert({ key: 'company_phone', value: phone ?? '' }),
    Setting.upsert({ key: 'company_logo_url', value: logoUrl ?? '' }),
    Setting.upsert({ key: 'company_promptpay_id', value: promptpayId ?? '' }),
  ]);
  res.status(200).json({ ok: true });
});

module.exports = { getLineSettings, updateLineSettings, getCompanySettings, updateCompanySettings };
