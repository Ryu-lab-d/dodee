'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardSummary } from '@/lib/types';

function Card({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === 'danger' ? 'text-red-600' : 'text-blue-700'}`}>
        {value}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>('/dashboard/summary')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-400">กำลังโหลด...</p>;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-slate-900">แดชบอร์ด</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="ทรัพย์สินทั้งหมด" value={String(data.totalProperties)} />
        <Card label="ผู้เช่าที่เช่าอยู่" value={String(data.activeTenants)} />
        <Card label="รายรับเดือนนี้" value={`฿${Number(data.monthIncome).toLocaleString()}`} />
        <Card label="ใบเรียกเก็บค้างชำระ" value={String(data.overdueInvoices)} tone={data.overdueInvoices > 0 ? 'danger' : undefined} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">สถานะห้อง</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex justify-between"><span>ห้องทั้งหมด</span><span>{data.roomStatus.total}</span></li>
            <li className="flex justify-between"><span>ไม่ว่าง</span><span>{data.roomStatus.occupied}</span></li>
            <li className="flex justify-between"><span>ว่าง</span><span>{data.roomStatus.vacant}</span></li>
            <li className="flex justify-between"><span>ซ่อม</span><span>{data.roomStatus.maintenance}</span></li>
          </ul>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">รายการล่าสุด</h2>
          {data.recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มีรายการ</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentTransactions.map((t) => (
                <li key={t.id} className="flex justify-between text-slate-600">
                  <span>{t.category}</span>
                  <span className={t.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                    {t.type === 'income' ? '+' : '-'}฿{Number(t.amount).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
