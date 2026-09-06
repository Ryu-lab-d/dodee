const { Op } = require('sequelize');
const { Tenant, Room, Property, Invoice, Notification } = require('../models');
const { recipientsForProperty } = require('../utils/recipients');
const lineService = require('./line.service');

const SINGLE_UNIT_TYPES = ['บ้าน', 'คอนโด'];
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const propertyUrl = (property) =>
  `${FRONTEND_URL}/${SINGLE_UNIT_TYPES.includes(property.type) ? 'houses' : 'properties'}/${property.id}`;

const todayStr = () => new Date().toISOString().slice(0, 10);

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// Creates the notification (plain text, shown in the in-app bell) + best-effort LINE push
// (a Flex card, same style as meeting minutes), skipping if this exact
// (user, referenceType, referenceId) alert already exists.
const notifyOnce = async ({ user, type, message, card, referenceType, referenceId }) => {
  const existing = await Notification.findOne({ where: { userId: user.id, referenceType, referenceId } });
  if (existing) return false;

  let sentVia = 'app';
  if (user.lineUserId) {
    const result = await lineService.pushMessages(user.lineUserId, [card]);
    if (result.ok) {
      sentVia = 'line';
    } else {
      // pushMessages already logs the underlying LINE error - this just ties it to the
      // specific alert, since this event is deduped and will never be retried via LINE.
      console.error(`[notification.service] LINE push failed for user ${user.id} (${type}/${referenceId}):`, result.error);
    }
  }

  await Notification.create({ userId: user.id, type, message, referenceType, referenceId, sentVia });
  return true;
};

// "Every Day at 8 AM: check contract_end_date - today = 30 days"
const checkContractExpiring = async () => {
  const targetDate = addDays(todayStr(), 30);
  const tenants = await Tenant.findAll({
    where: { status: 'เช่าอยู่', contractEndDate: targetDate },
    include: [{ model: Room, as: 'room', include: [{ model: Property, as: 'property' }] }],
  });

  let created = 0;
  for (const tenant of tenants) {
    const property = tenant.room?.property;
    if (!property) continue;
    const recipients = await recipientsForProperty(property);
    const roomLabel = tenant.room.roomNumber === 'หลัก' ? property.name : `${property.name} ห้อง ${tenant.room.roomNumber}`;
    const message = `⏰ สัญญาใกล้หมดอายุ: ${roomLabel} ของ "${tenant.name}" จะหมดสัญญาวันที่ ${tenant.contractEndDate} (อีก 30 วัน)`;
    const card = lineService.buildCard({
      altText: message,
      headerEmoji: '⏰',
      headerText: 'สัญญาใกล้หมดอายุ',
      headerColor: '#d97706',
      title: tenant.name,
      rows: [
        { label: 'ห้อง/ทรัพย์สิน', value: roomLabel },
        { label: 'หมดสัญญา', value: `${tenant.contractEndDate} (อีก 30 วัน)` },
      ],
      buttonLabel: 'ดูข้อมูลบน DoDee',
      buttonUrl: propertyUrl(property),
    });

    for (const user of recipients) {
      const ok = await notifyOnce({ user, type: 'contract_expiring', message, card, referenceType: 'tenant', referenceId: tenant.id });
      if (ok) created += 1;
    }
  }
  return created;
};

// Flip any issued invoices past their due date to "overdue", then notify about all
// currently-overdue invoices (dedup keeps this from re-notifying every day).
const checkPaymentOverdue = async () => {
  const today = todayStr();
  await Invoice.update({ status: 'overdue' }, { where: { status: 'issued', dueDate: { [Op.lt]: today } } });

  const overdueInvoices = await Invoice.findAll({
    where: { status: 'overdue' },
    include: [{ model: Room, as: 'room', include: [{ model: Property, as: 'property' }] }],
  });

  let created = 0;
  for (const invoice of overdueInvoices) {
    const property = invoice.room?.property;
    if (!property) continue;
    const recipients = await recipientsForProperty(property);
    const roomLabel = invoice.room.roomNumber === 'หลัก' ? property.name : `${property.name} ห้อง ${invoice.room.roomNumber}`;
    const message = `🔴 ค้างชำระ: ${roomLabel} ค้างชำระ ฿${Number(invoice.totalAmount).toLocaleString()} งวด ${invoice.billingMonth} (ครบกำหนด ${invoice.dueDate})`;
    const card = lineService.buildCard({
      altText: message,
      headerEmoji: '🔴',
      headerText: 'บิลค้างชำระ',
      headerColor: '#dc2626',
      title: roomLabel,
      rows: [
        { label: 'งวด', value: invoice.billingMonth },
        { label: 'ยอดค้างชำระ', value: `฿${Number(invoice.totalAmount).toLocaleString()}` },
        { label: 'ครบกำหนด', value: invoice.dueDate },
      ],
      buttonLabel: 'ดูข้อมูลบน DoDee',
      buttonUrl: `${FRONTEND_URL}/invoices`,
    });

    for (const user of recipients) {
      const ok = await notifyOnce({ user, type: 'payment_overdue', message, card, referenceType: 'invoice', referenceId: invoice.id });
      if (ok) created += 1;
    }
  }
  return created;
};

const runDailyChecks = async () => {
  const contractAlerts = await checkContractExpiring();
  const overdueAlerts = await checkPaymentOverdue();
  return { contractAlerts, overdueAlerts };
};

module.exports = { runDailyChecks, checkContractExpiring, checkPaymentOverdue };
