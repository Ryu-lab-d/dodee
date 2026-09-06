const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');
const { TERMS_VERSION, TERMS_TEXT } = require('../constants/terms');
const { VALID_PERMISSION_KEYS, loadMatrix } = require('../utils/permissions');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }

  const user = await User.findOne({ where: { username } });
  if (!user || user.status !== 'active') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = signToken(user);
  logActivity(user, 'login', 'เข้าสู่ระบบ');
  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

// Owner-only: create admin/manager accounts.
const register = asyncHandler(async (req, res) => {
  const { username, password, name, email, phone, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: 'username, password, name and role are required' });
  }
  if (!['manager', 'admin', 'owner'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ username, password: hashed, name, email, phone, role });
  logActivity(req.user, 'create_user', `สร้างบัญชีพนักงาน "${name}" (${role})`);
  res.status(201).json({ id: user.id, username: user.username, name: user.name, role: user.role });
});

const me = asyncHandler(async (req, res) => {
  const { id, username, name, email, phone, role, status, lineUserId, lineLinkCode, termsAcceptedAt, termsVersion } = req.user;
  const permissions =
    role === 'owner'
      ? Object.fromEntries([...VALID_PERMISSION_KEYS].map((k) => [k, true]))
      : (await loadMatrix())[role] || {};
  res.json({ id, username, name, email, phone, role, status, lineUserId, lineLinkCode, termsAcceptedAt, termsVersion, permissions });
});

const getTerms = asyncHandler(async (req, res) => {
  res.json({ version: TERMS_VERSION, text: TERMS_TEXT });
});

const acceptTerms = asyncHandler(async (req, res) => {
  const { signatureUrl } = req.body;
  if (!signatureUrl) return res.status(400).json({ message: 'signatureUrl is required' });

  await req.user.update({
    termsAcceptedAt: new Date(),
    termsVersion: TERMS_VERSION,
    termsSignatureUrl: signatureUrl,
  });
  logActivity(req.user, 'accept_terms', `ยอมรับเงื่อนไขการใช้งาน (v${TERMS_VERSION})`);
  res.status(200).json({ ok: true, termsAcceptedAt: req.user.termsAcceptedAt, termsVersion: TERMS_VERSION });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword และ newPassword จำเป็นต้องกรอก' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
  }

  const match = await bcrypt.compare(currentPassword, req.user.password);
  if (!match) return res.status(401).json({ message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });

  const hashed = await bcrypt.hash(newPassword, 10);
  await req.user.update({ password: hashed });
  logActivity(req.user, 'change_password', 'เปลี่ยนรหัสผ่านของตัวเอง');
  res.status(200).json({ ok: true });
});

module.exports = { login, register, me, changePassword, getTerms, acceptTerms };
