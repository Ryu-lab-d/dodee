const crypto = require('crypto');
const { User, Property, UserProperty } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');

const SAFE_ATTRS = ['id', 'username', 'name', 'email', 'phone', 'role', 'status', 'lineUserId', 'createdAt'];

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

  const { name, phone, email, role, status } = req.body;
  await user.update({ name, phone, email, role, status });
  logActivity(req.user, 'update_user', `แก้ไขบัญชี "${user.name}" (บทบาท: ${user.role}, สถานะ: ${user.status})`);
  res.json({ id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, status: user.status });
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

module.exports = { list, colleagues, update, assignProperties, generateLineLinkCode, unlinkLine };
