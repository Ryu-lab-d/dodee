const { sequelize, Payment, Invoice, Room, Transaction } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../utils/activityLog');

const list = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.invoiceId) where.invoiceId = req.query.invoiceId;
  const payments = await Payment.findAll({ where, order: [['paymentDate', 'DESC']] });
  res.json(payments);
});

const create = asyncHandler(async (req, res) => {
  const { invoiceId, amountPaid, paymentMethod, paymentReference, paymentDate } = req.body;
  if (!invoiceId || !amountPaid || !paymentMethod) {
    return res.status(400).json({ message: 'invoiceId, amountPaid and paymentMethod are required' });
  }

  const invoice = await Invoice.findByPk(invoiceId, { include: [{ model: Room, as: 'room' }] });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
  if (invoice.status === 'paid') return res.status(409).json({ message: 'ใบเรียกเก็บนี้ชำระแล้ว' });

  const payment = await sequelize.transaction(async (t) => {
    const ledgerEntry = await Transaction.create(
      {
        type: 'income',
        category: 'rent',
        amount: amountPaid,
        date: paymentDate || new Date().toISOString().slice(0, 10),
        description: `ชำระค่าเช่างวด ${invoice.billingMonth} ห้อง ${invoice.room.roomNumber}`,
        propertyId: invoice.room.propertyId,
        recordedBy: req.user.id,
      },
      { transaction: t }
    );

    const newPayment = await Payment.create(
      {
        invoiceId,
        paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
        amountPaid,
        paymentMethod,
        paymentReference,
        recordedBy: req.user.id,
        transactionId: ledgerEntry.id,
      },
      { transaction: t }
    );

    await invoice.update({ status: 'paid' }, { transaction: t });

    return newPayment;
  });

  logActivity(req.user, 'record_payment', `บันทึกชำระเงิน ฿${Number(amountPaid).toLocaleString()} ห้อง ${invoice.room.roomNumber} งวด ${invoice.billingMonth}`);
  res.status(201).json(payment);
});

// "Unmark payment (if recorded by mistake)": reverts the invoice back to issued and removes the ledger entry.
const remove = asyncHandler(async (req, res) => {
  const payment = await Payment.findByPk(req.params.id, { include: [{ model: Invoice, as: 'invoice' }] });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  await sequelize.transaction(async (t) => {
    await Invoice.update({ status: 'issued' }, { where: { id: payment.invoiceId }, transaction: t });
    if (payment.transactionId) {
      await Transaction.destroy({ where: { id: payment.transactionId }, transaction: t });
    }
    await payment.destroy({ transaction: t });
  });

  logActivity(req.user, 'unmark_payment', `ยกเลิกการชำระเงิน ฿${Number(payment.amountPaid).toLocaleString()} งวด ${payment.invoice?.billingMonth || ''}`);
  res.status(204).send();
});

module.exports = { list, create, remove };
