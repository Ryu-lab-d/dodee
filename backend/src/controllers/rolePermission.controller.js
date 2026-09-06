const { RolePermission } = require('../models');
const { PERMISSION_GROUPS, VALID_PERMISSION_KEYS, DEFAULT_PERMISSIONS, loadMatrix, invalidateCache } = require('../utils/permissions');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');

const ROLE_LABELS = { owner: 'เจ้าของ', admin: 'แอดมิน', manager: 'ผู้จัดการ' };

const list = asyncHandler(async (req, res) => {
  const matrix = await loadMatrix();
  res.json({ groups: PERMISSION_GROUPS, matrix, roleLabels: ROLE_LABELS });
});

const update = asyncHandler(async (req, res) => {
  const { role } = req.params;
  if (!['admin', 'manager'].includes(role)) return res.status(400).json({ message: 'Invalid role' });

  const { permissions } = req.body;
  if (!permissions || typeof permissions !== 'object') {
    return res.status(400).json({ message: 'permissions object is required' });
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(permissions)) {
    if (VALID_PERMISSION_KEYS.has(key)) sanitized[key] = !!value;
  }

  const [row] = await RolePermission.findOrCreate({
    where: { role },
    defaults: { permissions: { ...DEFAULT_PERMISSIONS[role], ...sanitized } },
  });
  await row.update({ permissions: { ...DEFAULT_PERMISSIONS[role], ...row.permissions, ...sanitized } });
  invalidateCache();

  logActivity(req.user, 'update_permissions', `แก้ไขสิทธิ์การใช้งานของบทบาท "${ROLE_LABELS[role]}"`);

  const matrix = await loadMatrix();
  res.json({ role, permissions: matrix[role] });
});

module.exports = { list, update };
