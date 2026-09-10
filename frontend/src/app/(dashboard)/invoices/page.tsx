'use client';

import { Fragment, useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Invoice, InvoiceStatus } from '@/lib/types';
import { SkeletonRows } from '@/components/Skeleton';
import { useConfirm } from '@/components/ConfirmDialog';
import { downloadCsv } from '@/lib/csv';

const thisMonth = () => new Date().toISOString().slice(0, 7);

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  issued: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-700',
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'ร่าง',
  issued: 'ออกบิลแล้ว',
  paid: 'ชำระแล้ว',
  overdue: 'ค้างชำระ',
};

export default function InvoicesPage() {
  const confirmDialog = useConfirm();
  const [month, setMonth] = useState(thisMonth());
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'qr' | 'cash'>('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get<Invoice[]>(`/invoices?billingMonth=${month}`)
      .then(setInvoices)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const handleGenerate = async () => {
    setError(null);
    setNotice(null);
    setGenerating(true);
    try {
      const res = await api.post<{ created: Invoice[]; skipped: { roomId: string; reason: string }[] }>(
        '/invoices/generate',
        { billingMonth: month }
      );
      setNotice(`สร้างใบเรียกเก็บสำเร็จ ${res.created.length} รายการ (ข้าม ${res.skipped.length} ห้อง)`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'สร้างใบเรียกเก็บไม่สำเร็จ');
    } finally {
      setGenerating(false);
    }
  };

  const openPayForm = (invoice: Invoice) => {
    setPayingId(invoice.id);
    setAmountPaid(invoice.totalAmount);
    setPaymentMethod('bank_transfer');
    setPaymentReference('');
    setError(null);
  };

  const handlePay = async (e: FormEvent) => {
    e.preventDefault();
    if (!payingId) return;
    setError(null);
    setSaving(true);
    try {
      await api.post('/payments', {
        invoiceId: payingId,
        amountPaid: Number(amountPaid),
        paymentMethod,
        paymentReference: paymentReference || undefined,
      });
      setPayingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกการชำระเงินไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleUnmark = async (inv: Invoice) => {
    const paymentId = inv.payments?.[inv.payments.length - 1]?.id;
    if (!paymentId) return;
    const ok = await confirmDialog({
      title: 'ยกเลิกการชำระเงิน',
      message: 'ใบเรียกเก็บจะกลับไปเป็นสถานะค้างชำระ',
      confirmLabel: 'ยกเลิกการชำระ',
    });
    if (!ok) return;
    setError(null);
    try {
      await api.delete(`/payments/${paymentId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ยกเลิกการชำระเงินไม่สำเร็จ');
    }
  };

  const handleExportCsv = () => {
    downloadCsv(
      `dodee-invoices-${month}.csv`,
      ['ห้อง', 'ทรัพย์สิน', 'งวด', 'ค่าเช่า', 'ค่าน้ำ', 'ค่าไฟ', 'อื่นๆ', 'รวม', 'สถานะ', 'ครบกำหนด'],
      invoices.map((inv) => [
        inv.room?.roomNumber,
        inv.room?.property?.name,
        inv.billingMonth,
        inv.baseRent,
        inv.waterCharge,
        inv.electricityCharge,
        inv.otherCharges,
        inv.totalAmount,
        STATUS_LABEL[inv.status],
        inv.dueDate,
      ])
    );
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">บิล & การชำระเงิน</h1>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button type="button"
            onClick={handleExportCsv}
            disabled={invoices.length === 0}
            className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            ส่งออก CSV
          </button>
          <button type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? 'กำลังสร้าง...' : 'สร้างใบเรียกเก็บของเดือนนี้'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {notice && <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-blue-100 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">ห้อง</th>
              <th className="px-4 py-2 font-medium">ค่าเช่า</th>
              <th className="px-4 py-2 font-medium">ค่าน้ำ</th>
              <th className="px-4 py-2 font-medium">ค่าไฟ</th>
              <th className="px-4 py-2 font-medium">รวม</th>
              <th className="px-4 py-2 font-medium">ครบกำหนด</th>
              <th className="px-4 py-2 font-medium">สถานะ</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <Fragment key={inv.id}>
                <tr
                  className="fade-up border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/50"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <td className="px-4 py-2 text-slate-900">
                    {inv.room?.property?.name}{inv.room?.roomNumber !== 'หลัก' ? ` - ห้อง ${inv.room?.roomNumber}` : ''}
                  </td>
                  <td className="px-4 py-2 text-slate-600">฿{Number(inv.baseRent).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-600">฿{Number(inv.waterCharge).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-600">฿{Number(inv.electricityCharge).toLocaleString()}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">฿{Number(inv.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-600">{inv.dueDate}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/invoices/${inv.id}/print`}
                      className="mr-2 text-xs font-medium text-slate-500 hover:text-blue-600"
                    >
                      พิมพ์
                    </Link>
                    {(inv.status === 'issued' || inv.status === 'overdue') && (
                      <button type="button"
                        onClick={() => openPayForm(inv)}
                        className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        บันทึกชำระเงิน
                      </button>
                    )}
                    {inv.status === 'paid' && (
                      <button type="button"
                        onClick={() => handleUnmark(inv)}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        ยกเลิกการชำระเงิน
                      </button>
                    )}
                  </td>
                </tr>
                {payingId === inv.id && (
                  <tr className="border-b border-slate-100 bg-sky-50">
                    <td colSpan={8} className="px-4 py-4">
                      <form onSubmit={handlePay} className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-700">จำนวนเงิน (บาท)</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            className="w-32 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={amountPaid}
                            onChange={(e) => setAmountPaid(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-700">ช่องทาง</label>
                          <select
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                          >
                            <option value="bank_transfer">โอนเงิน</option>
                            <option value="qr">QR / พร้อมเพย์</option>
                            <option value="cash">เงินสด</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-700">เลขอ้างอิง (ถ้ามี)</label>
                          <input
                            className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPayingId(null)}
                          className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
                        >
                          ยกเลิก
                        </button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {loading && <SkeletonRows count={5} cols={8} />}
            {!loading && invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-slate-400">ยังไม่มีใบเรียกเก็บของเดือนนี้</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
