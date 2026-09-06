const { RolePermission } = require('../models');

// Canonical permission keys, grouped for the Permissions page UI.
// Deleting things (properties/rooms/tenants) and anything account-level
// (staff management, company settings, this matrix itself) is intentionally
// NOT delegable here - it always stays owner-only, checked separately in routes.
const PERMISSION_GROUPS = [
  {
    key: 'property',
    label: 'ทรัพย์สิน & ห้องพัก',
    permissions: [
      { key: 'propertyManage', label: 'เพิ่ม/แก้ไขข้อมูลทรัพย์สิน' },
      { key: 'roomManage', label: 'เพิ่ม/แก้ไขห้องพัก' },
    ],
  },
  {
    key: 'tenant',
    label: 'ผู้เช่า',
    permissions: [{ key: 'tenantManage', label: 'เพิ่ม/แก้ไขข้อมูลผู้เช่า' }],
  },
  {
    key: 'meter',
    label: 'มิเตอร์น้ำ-ไฟ',
    permissions: [{ key: 'meterReadingManage', label: 'จดมิเตอร์น้ำ-ไฟ' }],
  },
  {
    key: 'finance',
    label: 'บิลและการเงิน',
    permissions: [
      { key: 'invoiceManage', label: 'สร้างใบเรียกเก็บเงิน' },
      { key: 'paymentManage', label: 'บันทึก/ยกเลิกการชำระเงิน' },
      { key: 'transactionManage', label: 'บันทึกรายรับ-รายจ่าย' },
    ],
  },
];

const VALID_PERMISSION_KEYS = new Set(PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key)));

// My starting design for the two delegable roles:
// - admin: the office/paperwork role - tenants + all money matters, no physical property setup.
// - manager: the on-site operations role - properties/rooms/tenants/meters, no money authority.
// Owner can retune every flag below from the Permissions page.
const DEFAULT_PERMISSIONS = {
  admin: {
    propertyManage: false,
    roomManage: false,
    tenantManage: true,
    meterReadingManage: false,
    invoiceManage: true,
    paymentManage: true,
    transactionManage: true,
  },
  manager: {
    propertyManage: true,
    roomManage: true,
    tenantManage: true,
    meterReadingManage: true,
    invoiceManage: false,
    paymentManage: false,
    transactionManage: false,
  },
};

let cache = null;
let cacheAt = 0;
const CACHE_MS = 10_000;

const loadMatrix = async () => {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const rows = await RolePermission.findAll();
  const matrix = { admin: { ...DEFAULT_PERMISSIONS.admin }, manager: { ...DEFAULT_PERMISSIONS.manager } };
  for (const row of rows) {
    matrix[row.role] = { ...matrix[row.role], ...row.permissions };
  }
  cache = matrix;
  cacheAt = Date.now();
  return matrix;
};

const invalidateCache = () => {
  cache = null;
};

const hasPermission = async (user, key) => {
  if (!user) return false;
  if (user.role === 'owner') return true;
  const matrix = await loadMatrix();
  return !!matrix[user.role]?.[key];
};

module.exports = {
  PERMISSION_GROUPS,
  VALID_PERMISSION_KEYS,
  DEFAULT_PERMISSIONS,
  loadMatrix,
  invalidateCache,
  hasPermission,
};
