const { Tenant, Room } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');
const { getAccessiblePropertyIds, canAccessProperty } = require('../utils/scope');
const { describeChanges } = require('../utils/diff');

const TENANT_FIELD_LABELS = {
  name: 'ชื่อ',
  phone: 'เบอร์โทร',
  email: 'อีเมล',
  idCard: 'เลขบัตรประชาชน',
  moveInDate: 'วันเข้าอยู่',
  contractEndDate: 'วันหมดสัญญา',
  depositAmount: 'เงินมัดจำ',
  status: 'สถานะ',
};

const list = asyncHandler(async (req, res) => {
  const accessibleIds = await getAccessiblePropertyIds(req.user);
  const where = {};
  if (req.query.roomId) where.roomId = req.query.roomId;
  if (req.query.status) where.status = req.query.status;
  const tenants = await Tenant.findAll({
    where,
    include: [{ model: Room, as: 'room', where: { propertyId: accessibleIds }, required: true }],
    order: [['createdAt', 'DESC']],
  });
  res.json(tenants);
});

const getOne = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findByPk(req.params.id, { include: [{ model: Room, as: 'room' }] });
  if (!tenant || !(await canAccessProperty(req.user, tenant.room?.propertyId))) {
    return res.status(404).json({ message: 'Tenant not found' });
  }
  if (req.user.role !== 'owner') {
    logActivity(req.user, 'view_tenant', `ดูรายละเอียดผู้เช่า "${tenant.name}"`);
  }
  res.json(tenant);
});

const create = asyncHandler(async (req, res) => {
  const { roomId, name, phone, email, idCard, moveInDate, contractEndDate, depositAmount } = req.body;
  if (!roomId || !name) return res.status(400).json({ message: 'roomId and name are required' });

  const room = await Room.findByPk(roomId);
  if (!room || !(await canAccessProperty(req.user, room.propertyId))) {
    return res.status(404).json({ message: 'Room not found' });
  }

  const tenant = await Tenant.create({
    roomId, name, phone, email, idCard, moveInDate, contractEndDate, depositAmount,
  });
  await room.update({ status: 'ไม่ว่าง' });
  logActivity(req.user, 'add_tenant', `เพิ่มผู้เช่า "${name}" เข้าห้อง ${room.roomNumber}`);
  res.status(201).json(tenant);
});

const update = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findByPk(req.params.id, { include: [{ model: Room, as: 'room' }] });
  if (!tenant || !(await canAccessProperty(req.user, tenant.room?.propertyId))) {
    return res.status(404).json({ message: 'Tenant not found' });
  }

  const before = tenant.toJSON();
  const { name, phone, email, idCard, moveInDate, contractEndDate, depositAmount, status } = req.body;
  await tenant.update({ name, phone, email, idCard, moveInDate, contractEndDate, depositAmount, status });

  const changes = describeChanges(before, tenant.toJSON(), TENANT_FIELD_LABELS);
  if (changes.length) {
    logActivity(req.user, 'update_tenant', `แก้ไขผู้เช่า "${tenant.name}": ${changes.join(', ')}`);
  }

  if (status === 'หมดสัญญา' || status === 'ยกเลิก') {
    await Room.update({ status: 'ว่าง' }, { where: { id: tenant.roomId } });
    logActivity(req.user, 'end_tenancy', `สิ้นสุดสัญญาผู้เช่า "${tenant.name}" (${status})`);
  }

  res.json(tenant);
});

const remove = asyncHandler(async (req, res) => {
  const tenant = await Tenant.findByPk(req.params.id, { include: [{ model: Room, as: 'room' }] });
  if (!tenant || !(await canAccessProperty(req.user, tenant.room?.propertyId))) {
    return res.status(404).json({ message: 'Tenant not found' });
  }
  await tenant.destroy();
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
