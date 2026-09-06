const { MeterReading, Room, Property } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.roomId) where.roomId = req.query.roomId;

  const readings = await MeterReading.findAll({
    where,
    include: [{ model: Room, as: 'room', include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }] }],
    order: [['readingDate', 'DESC']],
  });
  res.json(readings);
});

const getLatestForRoom = async (roomId) =>
  MeterReading.findOne({ where: { roomId }, order: [['readingDate', 'DESC']] });

// Rooms + whether they already have a reading for the given month (YYYY-MM), for the "today's reading list" screen.
const pending = asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const where = {};
  if (req.query.propertyId) where.propertyId = req.query.propertyId;

  const rooms = await Room.findAll({
    where,
    include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }],
    order: [['roomNumber', 'ASC']],
  });

  const results = await Promise.all(
    rooms.map(async (room) => {
      const latest = await getLatestForRoom(room.id);
      const hasReadingThisMonth = !!latest && latest.readingDate.slice(0, 7) === month;
      return {
        room,
        latestReading: latest,
        hasReadingThisMonth,
      };
    })
  );

  res.json(results);
});

const create = asyncHandler(async (req, res) => {
  const { roomId, readingDate, waterCurrent, electricityCurrent, meterImageUrl } = req.body;
  if (!roomId || !readingDate || waterCurrent == null || electricityCurrent == null) {
    return res.status(400).json({ message: 'roomId, readingDate, waterCurrent, electricityCurrent are required' });
  }

  const room = await Room.findByPk(roomId);
  if (!room) return res.status(404).json({ message: 'Room not found' });

  const previous = await getLatestForRoom(roomId);
  const waterPrevious = previous ? Number(previous.waterCurrent) : Number(room.meterWaterInitial);
  const electricityPrevious = previous ? Number(previous.electricityCurrent) : Number(room.meterElectricityInitial);

  if (Number(waterCurrent) < waterPrevious || Number(electricityCurrent) < electricityPrevious) {
    return res.status(400).json({
      message: 'ตัวเลขมิเตอร์ต้องไม่น้อยกว่าค่าครั้งก่อนหน้า',
      waterPrevious,
      electricityPrevious,
    });
  }

  const waterUnitUsed = Number(waterCurrent) - waterPrevious;
  const electricityUnitUsed = Number(electricityCurrent) - electricityPrevious;

  // Flag an unusually large jump so the UI can warn staff before saving is trusted blindly.
  const warning =
    (previous && waterUnitUsed > waterPrevious * 3 && waterUnitUsed > 20) ||
    (previous && electricityUnitUsed > electricityPrevious * 3 && electricityUnitUsed > 50)
      ? 'ค่าที่จดเพิ่มขึ้นผิดปกติจากครั้งก่อน กรุณาตรวจสอบอีกครั้ง'
      : null;

  const reading = await MeterReading.create({
    roomId,
    readingDate,
    waterPrevious,
    waterCurrent,
    electricityPrevious,
    electricityCurrent,
    waterUnitUsed,
    electricityUnitUsed,
    meterImageUrl,
    ocrStatus: meterImageUrl ? 'Scanned' : 'Manual',
    recordedBy: req.user.id,
  });

  res.status(201).json({ reading, warning });
});

module.exports = { list, pending, create };
