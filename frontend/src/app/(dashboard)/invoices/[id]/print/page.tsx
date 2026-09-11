'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { api, fileUrl } from '@/lib/api';
import { Invoice } from '@/lib/types';
import PromptPayQR from '@/components/PromptPayQR';
import { isValidPromptPayId } from '@/lib/promptpay';

interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
  promptpayId?: string;
}

export default function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Invoice>(`/invoices/${id}`).then(setInvoice).catch((err) => setError(err.message));
    api.get<CompanyProfile>('/settings/company').then(setCompany).catch(() => {});
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!invoice) return <p className="text-sm text-slate-400">กำลังโหลด...</p>;

  const tenant = invoice.room?.tenants?.find((t) => t.status === 'เช่าอยู่');
  const roomLabel = invoice.room?.roomNumber === 'หลัก' ? invoice.room?.property?.name : `${invoice.room?.property?.name} - ห้อง ${invoice.room?.roomNumber}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <button type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-8 shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            {company?.logoUrl && (
              <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                <Image src={fileUrl(company.logoUrl)} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900">{company?.name || 'DoDee'}</p>
              {company?.address && <p className="text-xs text-slate-500">{company.address}</p>}
              {company?.phone && <p className="text-xs text-slate-500">โทร {company.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-semibold text-slate-900">ใบเรียกเก็บค่าเช่า</h1>
            <p className="text-xs text-slate-500">งวด {invoice.billingMonth}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400">ผู้เช่า</p>
            <p className="text-slate-900">{tenant?.name || '-'}</p>
          </div>
          <div>
            <p className="text-slate-400">ห้อง/ทรัพย์สิน</p>
            <p className="text-slate-900">{roomLabel}</p>
          </div>
          <div>
            <p className="text-slate-400">วันที่ออกใบเรียกเก็บ</p>
            <p className="text-slate-900">{invoice.invoiceDate}</p>
          </div>
          <div>
            <p className="text-slate-400">ครบกำหนดชำระ</p>
            <p className="text-slate-900">{invoice.dueDate}</p>
          </div>
        </div>

        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 font-medium">รายการ</th>
              <th className="py-2 text-right font-medium">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-700">ค่าเช่า</td>
              <td className="py-2 text-right text-slate-900">฿{Number(invoice.baseRent).toLocaleString()}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-700">ค่าน้ำ</td>
              <td className="py-2 text-right text-slate-900">฿{Number(invoice.waterCharge).toLocaleString()}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-700">ค่าไฟ</td>
              <td className="py-2 text-right text-slate-900">฿{Number(invoice.electricityCharge).toLocaleString()}</td>
            </tr>
            {Number(invoice.otherCharges) > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-700">ค่าใช้จ่ายอื่นๆ</td>
                <td className="py-2 text-right text-slate-900">฿{Number(invoice.otherCharges).toLocaleString()}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 text-base font-semibold text-slate-900">รวมทั้งสิ้น</td>
              <td className="pt-3 text-right text-base font-semibold text-blue-700">
                ฿{Number(invoice.totalAmount).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>

        {company?.promptpayId && isValidPromptPayId(company.promptpayId) && invoice.status !== 'paid' && (
          <div className="mb-6 flex justify-center border-t border-slate-100 pt-6">
            <PromptPayQR promptpayId={company.promptpayId} amount={Number(invoice.totalAmount)} />
          </div>
        )}

        <p className="text-center text-xs text-slate-400">ขอบคุณที่ใช้บริการ · สร้างโดยระบบ DoDee</p>
      </div>
    </div>
  );
}
