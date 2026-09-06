const { Room, Tenant, Property } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { getAccessiblePropertyIds, canAccessProperty } = require('../utils/scope');

const list = asyncHandler(async (req, res) => {
  const accessibleIds = await getAccessiblePropertyIds(req.user);
  let propertyIds = accessibleIds;
  if (req.query.propertyId) {
    propertyIds = accessibleIds.includes(req.query.propertyId) ? [req.query.propertyId] : [];
  }
  const rooms = await Room.findAll({
    where: { propertyId: propertyIds },
    include: [
      { model: Property, as: 'property', attributes: ['id', 'name'] },
      { model: Tenant, as: 'tenants', where: { status: 'เช่าอยู่' }, required: false },
    ],
    order: [['roomNumber', 'ASC']],
  });
  res.json(rooms);
});

const getOne = asyncHandler(async (req, res) => {
  const room = await Room.findByPk(req.params.id, {
    include: [
      { model: Property, as: 'property' },
      { model: Tenant, as: 'tenants' },
    ],
  });
  if (!room || !(await canAccessProperty(req.user, room.propertyId))) {
    return res.status(404).json({ message: 'Room not found' });
  }
  res.json(room);
});

const create = asyncHandler(async (req, res) => {
  const {
    propertyId, roomNumber, roomType, baseRentPrice, meterWaterInitial, meterElectricityInitial,
    description, details, images,
  } = req.body;
  if (!propertyId || !roomNumber) {
    return res.status(400).json({ message: 'propertyId and roomNumber are required' });
  }
  if (!(await canAccessProperty(req.user, propertyId))) {
    return res.status(404).json({ message: 'Property not found' });
  }

  const room = await Room.create({
    propertyId,
    roomNumber,
    roomType,
    baseRentPrice,
    meterWaterInitial,
    meterElectricityInitial,
    description,
    details: details || [],
    images: images || [],
  });

  await Property.increment('totalRooms', { by: 1, where: { id: propertyId } });
  res.status(201).json(room);
});

const update = asyncHandler(async (req, res) => {
  const room = await Room.findByPk(req.params.id);
  if (!room || !(await canAccessProperty(req.user, room.propertyId))) {
    return res.status(404).json({ message: 'Room not found' });
  }

  const { roomNumber, roomType, baseRentPrice, status, description, details, images } = req.body;
  await room.update({ roomNumber, roomType, baseRentPrice, status, description, details, images });
  res.json(room);
});

const remove = asyncHandler(async (req, res) => {
  const room = await Room.findByPk(req.params.id);
  if (!room || !(await canAccessProperty(req.user, room.propertyId))) {
    return res.status(404).json({ message: 'Room not found' });
  }
  await room.destroy();
  await Property.decrement('totalRooms', { by: 1, where: { id: room.propertyId } });
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
