const crypto = require('crypto');
const { Setting } = require('../models');

const getSetting = async (key, envFallback) => {
  const row = await Setting.findByPk(key);
  return row?.value || envFallback || null;
};

// .trim() here means a value that got saved with stray whitespace (an easy mistake when
// pasting from the LINE Developers Console) self-heals on every read instead of silently
// failing every push/signature-check forever until someone re-enters it correctly.
const getAccessToken = async () => {
  const value = await getSetting('line_channel_access_token', process.env.LINE_CHANNEL_ACCESS_TOKEN);
  return value ? value.trim() : value;
};
const getChannelSecret = async () => {
  const value = await getSetting('line_channel_secret', process.env.LINE_CHANNEL_SECRET);
  return value ? value.trim() : value;
};

// Calls LINE's own API to confirm a token actually works, so a broken/expired/mistyped
// token is rejected at save time instead of being accepted and failing silently later.
const validateAccessToken = async (token) => {
  try {
    const res = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    return { ok: false, error: body.message || `LINE ปฏิเสธ Token นี้ (HTTP ${res.status})` };
  } catch (err) {
    return { ok: false, error: `เชื่อมต่อ LINE API ไม่สำเร็จ: ${err.message}` };
  }
};

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
  if (!token) {
    console.error('[line.service] push skipped: no channel access token configured');
    return { ok: false, error: 'ยังไม่ได้ตั้งค่า LINE Channel Access Token' };
  }
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
      // Logged (not just returned) so a broken/expired token shows up in server logs
      // instead of silently going nowhere - this was the main reason failures here
      // used to look like "LINE just stopped working" with no trace of why.
      console.error(`[line.service] push failed: HTTP ${res.status} - ${body}`);
      return { ok: false, error: `LINE API error ${res.status}: ${body}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[line.service] push threw:', err.message);
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
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  }).catch((err) => {
    console.error('[line.service] reply threw:', err.message);
    return null;
  });
  if (res && !res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[line.service] reply failed: HTTP ${res.status} - ${body}`);
  }
};

module.exports = {
  getSetting,
  getAccessToken,
  getChannelSecret,
  validateAccessToken,
  verifySignature,
  pushMessage,
  pushMessages,
  replyMessage,
  buildCard,
};
