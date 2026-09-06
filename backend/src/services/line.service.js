const crypto = require('crypto');
const { Setting } = require('../models');

const getSetting = async (key, envFallback) => {
  const row = await Setting.findByPk(key);
  return row?.value || envFallback || null;
};

const getAccessToken = () => getSetting('line_channel_access_token', process.env.LINE_CHANNEL_ACCESS_TOKEN);
const getChannelSecret = () => getSetting('line_channel_secret', process.env.LINE_CHANNEL_SECRET);

const verifySignature = (rawBody, signature, secret) => {
  if (!secret) return true; // no secret configured yet - can't verify, allow through
  const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  return hash === signature;
};

// Best-effort push: returns { ok, error } instead of throwing, so callers (e.g. meeting
// minutes) can still succeed even if LINE isn't configured yet or a push fails.
// `messages` is an array of LINE message objects (text, flex, etc) - max 5 per LINE's API.
const pushMessages = async (lineUserId, messages) => {
  const token = await getAccessToken();
  if (!token) return { ok: false, error: 'ยังไม่ได้ตั้งค่า LINE Channel Access Token' };
  if (!lineUserId) return { ok: false, error: 'ผู้ใช้นี้ยังไม่ได้เชื่อมต่อ LINE' };

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to: lineUserId, messages }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `LINE API error ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

const pushMessage = (lineUserId, text) => pushMessages(lineUserId, [{ type: 'text', text }]);

const infoRow = (label, value) => ({
  type: 'box',
  layout: 'baseline',
  spacing: 'sm',
  contents: [
    { type: 'text', text: label, color: '#94a3b8', size: 'sm', flex: 2 },
    { type: 'text', text: String(value), color: '#0f172a', size: 'sm', flex: 5, wrap: true },
  ],
});

// Shared LINE Flex Message "card" builder - every notification (meeting minutes, contract
// expiring, payment overdue, ...) should look and feel the same instead of plain text.
const buildCard = ({
  altText,
  headerEmoji,
  headerText,
  headerColor = '#2563eb',
  title,
  rows = [],
  bodyText,
  buttonLabel,
  buttonUrl,
}) => ({
  type: 'flex',
  altText,
  contents: {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'md',
      contents: [
        { type: 'text', text: `${headerEmoji} ${headerText}`, weight: 'bold', color: headerColor, size: 'sm' },
        { type: 'text', text: title, weight: 'bold', size: 'lg', wrap: true },
        { type: 'separator', margin: 'md' },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'md',
          spacing: 'sm',
          contents: rows.map((r) => infoRow(r.label, r.value)),
        },
        ...(bodyText
          ? [
              { type: 'separator', margin: 'md' },
              { type: 'text', text: bodyText, wrap: true, size: 'sm', color: '#475569', margin: 'md' },
            ]
          : []),
      ],
    },
    ...(buttonUrl && {
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: headerColor,
            action: { type: 'uri', label: buttonLabel || 'ดูข้อมูลบน DoDee', uri: buttonUrl },
          },
        ],
      },
    }),
  },
});

const replyMessage = async (replyToken, text) => {
  const token = await getAccessToken();
  if (!token) return;
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  }).catch(() => {});
};

module.exports = {
  getSetting,
  getAccessToken,
  getChannelSecret,
  verifySignature,
  pushMessage,
  pushMessages,
  replyMessage,
  buildCard,
};
