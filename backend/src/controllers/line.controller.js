const { User } = require('../models');
const lineService = require('../services/line.service');

// LINE calls this directly (no auth header) - verified via x-line-signature instead.
const webhook = async (req, res) => {
  const signature = req.headers['x-line-signature'];
  const secret = await lineService.getChannelSecret();

  // Fail closed: without a configured secret we cannot verify the request came from LINE.
  if (!secret || !lineService.verifySignature(req.body, signature, secret)) {
    console.error('[line.controller] webhook rejected: signature mismatch or no channel secret configured');
    return res.status(401).send('invalid signature');
  }

  res.status(200).send('ok'); // ack immediately, LINE expects a fast response

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return;
  }

  for (const event of payload.events || []) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue;
    const code = event.message.text.trim().toUpperCase();
    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    const user = await User.findOne({ where: { lineLinkCode: code } });
    if (user) {
      await user.update({ lineUserId, lineLinkCode: null });
      await lineService.replyMessage(event.replyToken, `เชื่อมต่อ LINE สำเร็จ! บัญชีนี้จะได้รับการแจ้งเตือนจากระบบ DoDee ในนาม "${user.name}"`);
    }
  }
};

module.exports = { webhook };
