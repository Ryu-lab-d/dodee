const { sequelize, Property, Room, Tenant, User, UserProperty } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');
const { getAccessiblePropertyIds, canAccessProperty } = require('../utils/scope');
const { describeChanges } = require('../utils/diff');

const PROPERTY_FIELD_LABELS = {
  name: 'ชื่อ',
  type: 'ประเภท',
  address: 'ที่อยู่',
  subdistrict: 'ตำบล/แขวง',
  district: 'อำเภอ/เขต',
  province: 'จังหวัด',
  postalCode: 'รหัสไปรษณีย์',
  waterRate: 'ค่าน้ำ/หน่วย',
  electricityRate: 'ค่าไฟ/หน่วย',
  description: 'รายละเอียด',
};

const roomsWithTenants = { model: Room, as: 'rooms', include: [{ model: Tenant, as: 'tenants' }] };

const SINGLE_UNIT_TYPES = ['บ้าน', 'คอนโด'];
const isSingleUnit = (type) => SINGLE_UNIT_TYPES.includes(type);

const list = asyncHandler(async (req, res) => {
  const ids = await getAccessiblePropertyIds(req.user);
  const where = { id: ids };
  if (req.query.type) where.type = req.query.type;
  if (req.query.category === 'hostel') where.type = 'หอพัก';
  if (req.query.category === 'single') where.type = SINGLE_UNIT_TYPES;
  const properties = await Property.findAll({ where, include: [roomsWithTenants], order: [['createdAt', 'DESC']] });
  res.json(properties);
});

const getOne = asyncHandler(async (req, res) => {
  if (!(await canAccessProperty(req.user, req.params.id))) {
    return res.status(404).json({ message: 'Property not found' });
  }
  const property = await Property.findByPk(req.params.id, {
    include: [roomsWithTenants],
  });
  if (!property) return res.status(404).json({ message: 'Property not found' });
  if (req.user.role !== 'owner') {
    logActivity(req.user, 'view_property', `ดูรายละเอียดทรัพย์สิน "${property.name}"`);
  }
  res.json(property);
});

// บ้าน/คอนโด are single-unit properties: the UI treats the property itself as the rentable
// unit, but tenants/meter readings/invoices are still keyed off Room, so we create one
// implicit Room ("หลัก") behind the scenes to reuse that pipeline.
const create = asyncHandler(async (req, res) => {
  const {
    name, type, address, subdistrict, district, province, postalCode, latitude, longitude,
    waterRate, electricityRate, description, details, images,
    baseRentPrice, meterWaterInitial, meterElectricityInitial,
  } = req.body;
  if (!name) return res.status(400).json({ message: 'name is required' });

  const property = await sequelize.transaction(async (t) => {
    const prop = await Property.create(
      {
        name,
        type,
        address,
        subdistrict,
        district,
        province,
        postalCode,
        latitude,
        longitude,
        waterRate,
        electricityRate,
        description,
        details: details || [],
        images: images || [],
        totalRooms: isSingleUnit(type) ? 1 : 0,
        ownerId: req.user.role === 'owner' ? req.user.id : req.body.ownerId,
      },
      { transaction: t }
    );

    if (isSingleUnit(type)) {
      await Room.create(
        {
          propertyId: prop.id,
          roomNumber: 'หลัก',
          roomType: type,
          baseRentPrice: baseRentPrice || 0,
          meterWaterInitial: meterWaterInitial || 0,
          meterElectricityInitial: meterElectricityInitial || 0,
        },
        { transaction: t }
      );
    }

    return prop;
  });

  const withRooms = await Property.findByPk(property.id, { include: [roomsWithTenants] });
  logActivity(req.user, 'create_property', `เพิ่มทรัพย์สิน "${property.name}"`);
  res.status(201).json(withRooms);
});

const update = asyncHandler(async (req, res) => {
  const property = await Property.findByPk(req.params.id, { include: [roomsWithTenants] });
  if (!property || !(await canAccessProperty(req.user, property.id))) {
    return res.status(404).json({ message: 'Property not found' });
  }

  const {
    name, type, address, subdistrict, district, province, postalCode, latitude, longitude,
    waterRate, electricityRate, description, details, images,
    baseRentPrice, meterWaterInitial, meterElectricityInitial,
  } = req.body;

  const before = property.toJSON();

  await property.update({
    name, type, address, subdistrict, district, province, postalCode, latitude, longitude,
    waterRate, electricityRate, description, details, images,
  });

  // Keep the implicit room's rent/meter baseline in sync when editing a single-unit property.
  if (isSingleUnit(property.type) && property.rooms?.[0]) {
    await property.rooms[0].update({
      ...(baseRentPrice != null ? { baseRentPrice } : {}),
      ...(meterWaterInitial != null ? { meterWaterInitial } : {}),
      ...(meterElectricityInitial != null ? { meterElectricityInitial } : {}),
    });
  }

  const refreshed = await Property.findByPk(property.id, { include: [roomsWithTenants] });
  const changes = describeChanges(before, property.toJSON(), PROPERTY_FIELD_LABELS);
  const desc = changes.length
    ? `แก้ไขทรัพย์สิน "${property.name}": ${changes.join(', ')}`
    : `แก้ไขทรัพย์สิน "${property.name}"`;
  logActivity(req.user, 'update_property', desc);
  res.json(refreshed);
});

const remove = asyncHandler(async (req, res) => {
  const property = await Property.findByPk(req.params.id);
  if (!property) return res.status(404).json({ message: 'Property not found' });
  if (property.ownerId !== req.user.id) return res.status(404).json({ message: 'Property not found' });
  await property.destroy();
  logActivity(req.user, 'delete_property', `ลบทรัพย์สิน "${property.name}"`);
  res.status(204).send();
});

const assignUser = asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  const property = await Property.findByPk(req.params.id);
  if (!property || property.ownerId !== req.user.id) {
    return res.status(404).json({ message: 'Property not found' });
  }
  const user = await User.findByPk(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const [assignment] = await UserProperty.findOrCreate({
    where: { userId, propertyId: req.params.id },
  });
  res.status(201).json(assignment);
});

module.exports = { list, getOne, create, update, remove, assignUser };
