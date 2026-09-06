const { Op } = require('sequelize');
const { Tenant, Room, Property, Invoice, MeetingMinute, MeterReading } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { getAccessiblePropertyIds } = require('../utils/scope');

const monthRange = (month) => {
  const [year, m] = month.split('-').map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
};

// Aggregates the events staff actually need to plan around into one calendar:
// tenant contract end dates, invoice due dates, meeting minutes, and meter reading days.
const list = asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const { from, to } = monthRange(month);
  const propertyIds = await getAccessiblePropertyIds(req.user);

  const [tenants, invoices, meetings, readings] = await Promise.all([
    Tenant.findAll({
      where: { contractEndDate: { [Op.between]: [from, to] }, status: 'เช่าอยู่' },
      include: [{
        model: Room, as: 'room', required: true, where: { propertyId: propertyIds },
        include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }],
      }],
    }),
    Invoice.findAll({
      where: { dueDate: { [Op.between]: [from, to] } },
      include: [{ model: Room, as: 'room', required: true, where: { propertyId: propertyIds } }],
    }),
    MeetingMinute.findAll({
      where: { recordDate: { [Op.between]: [from, to] } },
    }),
    MeterReading.findAll({
      where: { readingDate: { [Op.between]: [from, to] } },
      include: [{
        model: Room, as: 'room', required: true, where: { propertyId: propertyIds },
        include: [{ model: Property, as: 'property', attributes: ['id', 'name'] }],
      }],
    }),
  ]);

  const events = [
    ...tenants.map((t) => ({
      id: `contract_end-${t.id}`,
      date: t.contractEndDate,
      type: 'contract_end',
      title: `สัญญาหมดอายุ: ${t.room?.roomNumber !== 'หลัก' ? `ห้อง ${t.room?.roomNumber}` : t.room?.property?.name || ''} - ${t.name}`,
      link: '/tenants',
    })),
    ...invoices.map((inv) => ({
      id: `invoice_due-${inv.id}`,
      date: inv.dueDate,
      type: 'invoice_due',
      title: `ครบกำหนดชำระ: ${inv.room?.roomNumber !== 'หลัก' ? `ห้อง ${inv.room?.roomNumber}` : ''} ฿${Number(inv.totalAmount).toLocaleString()}`,
      status: inv.status,
      link: `/invoices/${inv.id}`,
    })),
    ...meetings.map((m) => ({
      id: `meeting-${m.id}`,
      date: m.recordDate,
      type: 'meeting',
      title: `บันทึกการประชุม: ${m.title || 'ไม่มีหัวข้อ'}`,
      link: `/meeting-minutes/${m.id}`,
    })),
    ...readings.map((r) => ({
      id: `meter_reading-${r.id}`,
      date: r.readingDate,
      type: 'meter_reading',
      title: `จดมิเตอร์: ${r.room?.roomNumber !== 'หลัก' ? `ห้อง ${r.room?.roomNumber}` : r.room?.property?.name || ''}`,
      link: '/meter-readings',
    })),
  ];

  res.json(events);
});

module.exports = { list };
