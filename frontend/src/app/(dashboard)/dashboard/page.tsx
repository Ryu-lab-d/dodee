'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gauge, AlertTriangle, CalendarClock } from 'lucide-react';
import { api } from '@/lib/api';
import { DashboardSummary, InvoiceStatus } from '@/lib/types';
import CountUp from '@/components/CountUp';
import DashboardTrendChart from '@/components/DashboardTrendChart';
import { SkeletonBlock } from '@/components/Skeleton';

const INVOICE_STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  issued: 'bg-blue-50 text-blue-700',
  paid: 'bg-green-50 text-green-700',
  overdue: 'bg-red-50 text-red-700',
};

const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'ฉบับร่าง',
  issued: 'ออกบิลแล้ว',
  paid: 'ชำระแล้ว',
  overdue: 'เกินกำหนด',
};

const thaiDate = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

function Card({
  label,
  value,
  tone,
  delay = 0,
  format,
}: {
  label: string;
  value: number;
  tone?: 'danger' | 'success';
  delay?: number;
  format?: (n: number) => string;
}) {
  return (
    <div
      className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          tone === 'danger' ? 'text-red-600' : tone === 'success' ? 'text-green-600' : 'text-blue-700'
        }`}
      >
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

  const actionItems = [
    ...data.upcomingContracts.map((c) => ({
      id: `contract-${c.id}`,
      date: c.contractEndDate,
      icon: <CalendarClock size={15} className="text-amber-600" />,
      text: (
        <>
          สัญญา <span className="font-medium text-slate-900">{c.tenantName}</span> ({c.roomLabel}) หมดอายุ
        </>
      ),
      link: '/tenants',
    })),
    ...data.upcomingInvoices.map((inv) => ({
      id: `invoice-${inv.id}`,
      date: inv.dueDate,
      icon: <AlertTriangle size={15} className={inv.status === 'overdue' ? 'text-red-600' : 'text-amber-600'} />,
      text: (
        <>
          บิล {inv.roomLabel} ฿{Number(inv.totalAmount).toLocaleString()}{' '}
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${INVOICE_STATUS_STYLE[inv.status]}`}>
            {INVOICE_STATUS_LABEL[inv.status]}
          </span>
        </>
      ),
      link: `/invoices/${inv.id}`,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div>
      <h1 className="fade-up mb-6 text-xl font-semibold text-slate-900">แดชบอร์ด</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="ทรัพย์สินทั้งหมด" value={data.totalProperties} delay={0} />
        <Card label="ผู้เช่าที่เช่าอยู่" value={data.activeTenants} delay={70} />
        <Card
          label="ใบเรียกเก็บค้างชำระ"
          value={data.overdueInvoices}
          tone={data.overdueInvoices > 0 ? 'danger' : undefined}
          delay={140}
        />
        <Card
          label="ห้องที่ยังไม่จดมิเตอร์เดือนนี้"
          value={data.pendingMeterReadings}
          tone={data.pendingMeterReadings > 0 ? 'danger' : undefined}
          delay={210}
        />
      </div>

      <p className="fade-up mb-3 mt-8 text-sm font-semibold text-slate-900" style={{ animationDelay: '250ms' }}>
        การเงินเดือนนี้
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="รายรับ" value={data.monthIncome} delay={260} format={(n) => `฿${n.toLocaleString()}`} />
        <Card
          label="รายจ่าย"
          value={data.monthExpense}
          delay={310}
          format={(n) => `฿${n.toLocaleString()}`}
        />
        <Card
          label="กำไรสุทธิ"
          value={data.profit}
          tone={data.profit >= 0 ? 'success' : 'danger'}
          delay={360}
          format={(n) => `฿${n.toLocaleString()}`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" style={{ animationDelay: '420ms' }}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">แนวโน้มรายรับ-รายจ่าย 6 เดือน</h2>
          <DashboardTrendChart data={data.trend} />
        </div>

        <div className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" style={{ animationDelay: '480ms' }}>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Gauge size={16} className="text-amber-600" /> ต้องดำเนินการภายใน 14 วัน
          </h2>
          {actionItems.length === 0 ? (
            <p className="text-sm text-slate-400">ไม่มีรายการที่ต้องดำเนินการเร็ว ๆ นี้</p>
          ) : (
            <ul className="space-y-2.5">
              {actionItems.slice(0, 6).map((item, i) => (
                <li key={item.id} className="fade-up" style={{ animationDelay: `${520 + i * 40}ms` }}>
                  <Link href={item.link} className="flex items-start gap-2 rounded-lg p-1.5 text-sm text-slate-600 hover:bg-slate-50">
                    <span className="mt-0.5 shrink-0">{item.icon}</span>
                    <span className="flex-1">{item.text}</span>
                    <span className="shrink-0 text-xs text-slate-400">{thaiDate(item.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" style={{ animationDelay: '560ms' }}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">สถานะห้อง</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex justify-between"><span>ห้องทั้งหมด</span><span>{data.roomStatus.total}</span></li>
            <li className="flex justify-between"><span>ไม่ว่าง</span><span>{data.roomStatus.occupied}</span></li>
            <li className="flex justify-between"><span>ว่าง</span><span>{data.roomStatus.vacant}</span></li>
            <li className="flex justify-between"><span>ซ่อม</span><span>{data.roomStatus.maintenance}</span></li>
          </ul>
        </div>

        <div className="hover-card fade-up rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" style={{ animationDelay: '620ms' }}>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">รายการล่าสุด</h2>
          {data.recentTransactions.length === 0 ? (
            <p className="text-sm text-slate-400">ยังไม่มีรายการ</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentTransactions.map((t, i) => (
                <li
                  key={t.id}
                  className="fade-up flex justify-between text-slate-600"
                  style={{ animationDelay: `${660 + i * 50}ms` }}
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
