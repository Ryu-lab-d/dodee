'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { api, fileUrl } from '@/lib/api';
import { AppTransaction, FinancialSummary, Property } from '@/lib/types';

interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  'income:rent': 'รายรับ - ค่าเช่า',
  'income:อื่นๆ': 'รายรับ - อื่นๆ',
  'expense:ซ่อมบำรุง': 'รายจ่าย - ซ่อมบำรุง',
  'expense:ค่าน้ำ': 'รายจ่าย - ค่าน้ำ',
  'expense:ค่าไฟ': 'รายจ่าย - ค่าไฟ',
  'expense:เงินเดือน': 'รายจ่าย - เงินเดือน',
  'expense:ภาษี': 'รายจ่าย - ภาษี',
  'expense:อื่นๆ': 'รายจ่าย - อื่นๆ',
};

export default function ReportsPrintPage() {
  const params = useSearchParams();
  const month = params.get('month') || new Date().toISOString().slice(0, 7);
  const propertyId = params.get('propertyId') || '';

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [property, setProperty] = useState<Property | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = `month=${month}${propertyId ? `&propertyId=${propertyId}` : ''}`;
    api.get<FinancialSummary>(`/transactions/summary?${query}`).then(setSummary).catch((err) => setError(err.message));
    api.get<AppTransaction[]>(`/transactions?${query}`).then(setTransactions).catch(() => {});
    api.get<CompanyProfile>('/settings/company').then(setCompany).catch(() => {});
    if (propertyId) api.get<Property>(`/properties/${propertyId}`).then(setProperty).catch(() => {});
  }, [month, propertyId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!summary) return <p className="text-sm text-slate-400">กำลังโหลด...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end gap-2 print:hidden">
        <button
          type="button"
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
            <h1 className="text-lg font-semibold text-slate-900">รายงานรายรับ-รายจ่าย</h1>
            <p className="text-xs text-slate-500">งวด {month}</p>
            <p className="text-xs text-slate-500">{property ? property.name : 'ทุกทรัพย์สิน'}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400">รายรับรวม</p>
            <p className="mt-1 text-lg font-semibold text-green-600">฿{summary.totalIncome.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">รายจ่ายรวม</p>
            <p className="mt-1 text-lg font-semibold text-red-600">฿{summary.totalExpense.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">กำไร-ขาดทุน</p>
            <p className={`mt-1 text-lg font-semibold ${summary.profit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
              ฿{summary.profit.toLocaleString()}
            </p>
          </div>
        </div>

        {summary.byCategory.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 text-sm font-semibold text-slate-900">สรุปตามหมวดหมู่</p>
            <table className="w-full text-sm">
              <tbody>
                {summary.byCategory.map((c, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-600">{CATEGORY_LABEL[`${c.type}:${c.category}`] || `${c.type}: ${c.category}`}</td>
                    <td className={`py-1.5 text-right font-medium ${c.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {c.type === 'income' ? '+' : '-'}฿{Number(c.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">รายการทั้งหมด</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 font-medium">วันที่</th>
                <th className="py-2 font-medium">หมวดหมู่</th>
                <th className="py-2 font-medium">ทรัพย์สิน</th>
                <th className="py-2 text-right font-medium">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="py-1.5 text-slate-600">{t.date}</td>
                  <td className="py-1.5 text-slate-600">{t.category}</td>
                  <td className="py-1.5 text-slate-600">{t.property?.name || '-'}</td>
                  <td className={`py-1.5 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {t.type === 'income' ? '+' : '-'}฿{Number(t.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">ไม่มีรายการในงวดนี้</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">สร้างโดยระบบ DoDee</p>
      </div>
    </div>
  );
}
