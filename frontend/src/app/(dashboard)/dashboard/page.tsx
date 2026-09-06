'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DashboardSummary } from '@/lib/types';
import CountUp from '@/components/CountUp';
import { SkeletonBlock } from '@/components/Skeleton';

function Card({
  label,
  value,
  tone,
  delay = 0,
  format,
}: {
  label: string;
  value: number;
  tone?: 'danger';
  delay?: number;
  format?: (n: number) => string;
}) {
  return (
    <div
      className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === 'danger' ? 'text-red-600' : 'text-blue-700'}`}>
        <CountUp value={value} format={format} />
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

  if (!data) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-semibold text-slate-900">แดชบอร์ด</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <SkeletonBlock className="h-3.5 w-24" />
              <SkeletonBlock className="mt-2 h-6 w-16" />
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <SkeletonBlock className="mb-3 h-4 w-28" />
              <div className="space-y-2.5">
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-5/6" />
                <SkeletonBlock className="h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="fade-up mb-6 text-xl font-semibold text-slate-900">แดชบอร์ด</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="ทรัพย์สินทั้งหมด" value={data.totalProperties} delay={0} />
        <Card label="ผู้เช่าที่เช่าอยู่" value={data.activeTenants} delay={70} />
        <Card
          label="รายรับเดือนนี้"
          value={Number(data.monthIncome)}
          delay={140}
          format={(n) => `฿${n.toLocaleString()}`}
        />
        <Card
          label="ใบเรียกเก็บค้างชำระ"
          value={data.overdueInvoices}
          tone={data.overdueInvoices > 0 ? 'danger' : undefined}
          delay={210}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" style={{ animationDelay: '280ms' }}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">สถานะห้อง</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex justify-between"><span>ห้องทั้งหมด</span><span>{data.roomStatus.total}</span></li>
            <li className="flex justify-between"><span>ไม่ว่าง</span><span>{data.roomStatus.occupied}</span></li>
            <li className="flex justify-between"><span>ว่าง</span><span>{data.roomStatus.vacant}</span></li>
            <li className="flex justify-between"><span>ซ่อม</span><span>{data.roomStatus.maintenance}</span></li>
          </ul>
        </div>

        <div className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" style={{ animationDelay: '350ms' }}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">รายการล่าสุด</h2>
          {data.recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มีรายการ</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentTransactions.map((t, i) => (
                <li
                  key={t.id}
                  className="fade-up flex justify-between text-slate-600"
                  style={{ animationDelay: `${400 + i * 50}ms` }}
                >
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
