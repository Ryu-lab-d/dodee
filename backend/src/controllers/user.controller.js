const crypto = require('crypto');
const { User, Property, UserProperty, MeetingMinute } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');

const SAFE_ATTRS = ['id', 'username', 'name', 'email', 'phone', 'avatarUrl', 'role', 'status', 'lineUserId', 'createdAt'];

const list = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    attributes: SAFE_ATTRS,
    include: [{ model: Property, as: 'assignedProperties', attributes: ['id', 'name'], through: { attributes: [] } }],
    order: [['createdAt', 'ASC']],
  });
  res.json(users);
});

// Minimal roster any logged-in user can see, e.g. to pick recipients for meeting minutes.
const colleagues = asyncHandler(async (req, res) => {
  const users = await User.findAll({
    where: { status: 'active' },
    attributes: ['id', 'name', 'role', 'lineUserId'],
    order: [['name', 'ASC']],
  });
  res.json(users);
});

const update = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const { name, phone, email, avatarUrl, role, status } = req.body;
  await user.update({ name, phone, email, avatarUrl, role, status });
  logActivity(req.user, 'update_user', `แก้ไขบัญชี "${user.name}" (บทบาท: ${user.role}, สถานะ: ${user.status})`);
  res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, avatarUrl: user.avatarUrl, role: user.role, status: user.status });
});

// Permanently deletes a staff/admin/manager account. Owner accounts and self-deletion are
// blocked outright. Property assignments are cleared first (safe to lose).
//
// Meeting minutes reference the recording user via a real FK that turned out to be
// ON DELETE CASCADE at the DB level (found by testing this against production directly,
// not by reading the model - Sequelize's association here doesn't declare onDelete at
// all, so this was already the DB's existing behavior, not something this endpoint set
// up). A plain user.destroy() would therefore silently wipe out any meeting minutes this
// person ever recorded instead of throwing - losing real business records as a side
// effect of removing a login is not acceptable, so it's checked and refused explicitly
// up front rather than relying on the DB to reject it.
const remove = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role === 'owner') return res.status(403).json({ message: 'ไม่สามารถลบบัญชีเจ้าของได้' });
  if (user.id === req.user.id) return res.status(400).json({ message: 'ไม่สามารถลบบัญชีของตัวเองได้' });

  const meetingMinuteCount = await MeetingMinute.count({ where: { recordedByUserId: user.id } });
  if (meetingMinuteCount > 0) {
    return res.status(409).json({
      message: 'ไม่สามารถลบบัญชีนี้ได้ เนื่องจากเคยบันทึกการประชุมไว้ในระบบ กรุณาระงับการใช้งานแทนเพื่อรักษาประวัติ',
    });
  }

  await UserProperty.destroy({ where: { userId: user.id } });

  const name = user.name;
  const role = user.role;
  try {
    await user.destroy();
  } catch (err) {
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({
        message: 'ไม่สามารถลบบัญชีนี้ได้ เนื่องจากมีข้อมูลอื่นในระบบอ้างอิงอยู่ กรุณาระงับการใช้งานแทน',
      });
    }
    throw err;
  }

  logActivity(req.user, 'delete_user', `ลบบัญชีพนักงาน "${name}" (${role})`);
  res.status(204).send();
});

const assignProperties = asyncHandler(async (req, res) => {
  const { propertyIds } = req.body;
  if (!Array.isArray(propertyIds)) return res.status(400).json({ message: 'propertyIds must be an array' });

  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  await UserProperty.destroy({ where: { userId: user.id } });
  await UserProperty.bulkCreate(propertyIds.map((propertyId) => ({ userId: user.id, propertyId })));

  logActivity(req.user, 'assign_properties', `มอบหมายทรัพย์สิน ${propertyIds.length} รายการให้ "${user.name}"`);
  res.status(200).json({ ok: true });
});

// Self-service: any logged-in user can (re)generate their own LINE link code.
const generateLineLinkCode = asyncHandler(async (req, res) => {
  const code = `LINK-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  await req.user.update({ lineLinkCode: code, lineUserId: null });
  res.json({ code });
});

const unlinkLine = asyncHandler(async (req, res) => {
  await req.user.update({ lineUserId: null, lineLinkCode: null });
  res.status(204).send();
});

module.exports = { list, colleagues, update, remove, assignProperties, generateLineLinkCode, unlinkLine };
