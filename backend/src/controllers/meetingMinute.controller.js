const { MeetingMinute, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const lineService = require('../services/line.service');
const { logActivity } = require('../utils/activityLog');

const list = asyncHandler(async (req, res) => {
  const minutes = await MeetingMinute.findAll({
    include: [{ model: User, as: 'recordedByUser', attributes: ['id', 'name'] }],
    order: [['recordDate', 'DESC'], ['createdAt', 'DESC']],
  });
  res.json(minutes);
});

const getOne = asyncHandler(async (req, res) => {
  const minute = await MeetingMinute.findByPk(req.params.id, {
    include: [{ model: User, as: 'recordedByUser', attributes: ['id', 'name'] }],
  });
  if (!minute) return res.status(404).json({ message: 'Meeting minute not found' });
  res.json(minute);
});

// A LINE Flex Message "card" with a button that deep-links straight into the DoDee web app
// for this specific meeting minute, instead of a plain-text notification.
const buildFlexMessage = (minute) => {
  const excerpt = minute.content.length > 200 ? `${minute.content.slice(0, 200)}...` : minute.content;
  const detailUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/meeting-minutes/${minute.id}`;

  return lineService.buildCard({
    altText: `📋 บันทึกการประชุมใหม่: ${minute.title || 'ไม่มีหัวข้อ'} (บันทึกโดย ${minute.recordedByName})`,
    headerEmoji: '📋',
    headerText: 'บันทึกการประชุมใหม่',
    headerColor: '#2563eb',
    title: minute.title || 'ไม่มีหัวข้อ',
    rows: [
      { label: 'บันทึกโดย', value: minute.recordedByName },
      { label: 'วันที่', value: minute.recordDate },
      ...(minute.location ? [{ label: 'สถานที่', value: minute.location }] : []),
    ],
    bodyText: excerpt,
    buttonLabel: 'ดูข้อมูลบน DoDee',
    buttonUrl: detailUrl,
  });
};

const create = asyncHandler(async (req, res) => {
  const { title, recordedByName, recordDate, location, attendees, content, details, recipientIds } = req.body;

  if (!recordedByName || !recordDate || !content) {
    return res.status(400).json({ message: 'recordedByName, recordDate และ content จำเป็นต้องกรอก' });
  }
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return res.status(400).json({ message: 'ต้องเลือกผู้รับอย่างน้อย 1 คน' });
  }

  const minute = await MeetingMinute.create({
    title,
    recordedByName,
    recordedByUserId: req.user.id,
    recordDate,
    location,
    attendees,
    content,
    details: details || [],
    recipientIds,
  });

  const recipients = await User.findAll({ where: { id: recipientIds } });
  const flexMessage = buildFlexMessage(minute);
  const pushResults = await Promise.all(
    recipients.map(async (user) => {
      const result = await lineService.pushMessages(user.lineUserId, [flexMessage]);
      return { userId: user.id, name: user.name, ...result };
    })
  );

  logActivity(req.user, 'create_meeting_minute', `บันทึกการประชุม "${minute.title || 'ไม่มีหัวข้อ'}" ส่งถึง ${recipientIds.length} คน`);
  res.status(201).json({ minute, pushResults });
});

const remove = asyncHandler(async (req, res) => {
  const minute = await MeetingMinute.findByPk(req.params.id);
  if (!minute) return res.status(404).json({ message: 'Meeting minute not found' });
  await minute.destroy();
  logActivity(req.user, 'delete_meeting_minute', `ลบบันทึกการประชุม "${minute.title || 'ไม่มีหัวข้อ'}"`);
  res.status(204).send();
});

module.exports = { list, getOne, create, remove };
