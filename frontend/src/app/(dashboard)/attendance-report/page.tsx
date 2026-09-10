'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { AttendanceReportRow } from '@/lib/types';
import { SkeletonRows } from '@/components/Skeleton';

const todayThaiStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }) : '-';

const ROLE_LABEL: Record<string, string> = { admin: 'แอดมิน', manager: 'ผู้จัดการ' };

function StatusBadge({ row }: { row: AttendanceReportRow }) {
  if (!row.checkInAt) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">ยังไม่เช็คชื่อ</span>;
  }
  if (row.checkInMethod === 'override') {
    return <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">เข้าถึงนอกเวลา</span>;
  }
  if (row.checkInLateMinutes && row.checkInLateMinutes > 0) {
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">สาย {row.checkInLateMinutes} นาที</span>;
  }
  return <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">ตรงเวลา</span>;
}

export default function AttendanceReportPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [date, setDate] = useState(todayThaiStr());
  const [rows, setRows] = useState<AttendanceReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'owner') router.replace('/dashboard');
  }, [user, router]);

  useEffect(() => {
    if (user?.role !== 'owner') return;
    setRows(null);
    api
      .get<{ date: string; rows: AttendanceReportRow[] }>(`/attendance/report?date=${date}`)
      .then((res) => setRows(res.rows))
      .catch((err) => setError(err.message));
  }, [date, user]);

  if (user && user.role !== 'owner') return null;

  const onTimeCount = rows?.filter((r) => r.checkInAt && r.checkInMethod === 'normal' && !r.checkInLateMinutes).length ?? 0;
  const lateCount = rows?.filter((r) => r.checkInAt && r.checkInMethod === 'normal' && (r.checkInLateMinutes || 0) > 0).length ?? 0;
  const overrideCount = rows?.filter((r) => r.checkInMethod === 'override').length ?? 0;
  const absentCount = rows?.filter((r) => !r.checkInAt).length ?? 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">เวลาทำงาน</h1>
          <p className="text-sm text-slate-500">ดูว่าใครเช็คชื่อเข้างานตรงเวลา ใครสาย และใครเข้าถึงข้อมูลนอกเวลา ในแต่ละวัน</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 print:hidden"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 print:hidden"
          >
            พิมพ์ / PDF
          </button>
          <p className="hidden text-sm text-slate-500 print:block">วันที่ {date}</p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {rows && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-xs text-slate-400">ตรงเวลา</p>
            <p className="mt-1 text-xl font-bold text-green-600">{onTimeCount}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-xs text-slate-400">สาย</p>
            <p className="mt-1 text-xl font-bold text-amber-600">{lateCount}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-xs text-slate-400">เข้าถึงนอกเวลา</p>
            <p className="mt-1 text-xl font-bold text-purple-600">{overrideCount}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white p-4">
            <p className="text-xs text-slate-400">ยังไม่เช็คชื่อ</p>
            <p className="mt-1 text-xl font-bold text-slate-500">{absentCount}</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-blue-100 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">ชื่อ</th>
                <th className="px-4 py-2 font-medium">บทบาท</th>
                <th className="px-4 py-2 font-medium">เข้างาน</th>
                <th className="px-4 py-2 font-medium">ออกงาน</th>
                <th className="px-4 py-2 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row, i) => (
                <tr
                  key={row.userId}
                  className="fade-up border-b border-slate-100 last:border-0"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <td className="px-4 py-2.5 text-slate-900">{row.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{ROLE_LABEL[row.role] || row.role}</td>
                  <td className="px-4 py-2.5 text-slate-700">{fmtTime(row.checkInAt)}</td>
                  <td className="px-4 py-2.5 text-slate-700">
                    {fmtTime(row.checkOutAt)}
                    {row.checkOutEarly && row.checkOutEarlyMinutes ? (
                      <span className="ml-1.5 text-xs text-amber-600">(ก่อนเวลา {row.checkOutEarlyMinutes} นาที)</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge row={row} />
                  </td>
                </tr>
              ))}
              {!rows && <SkeletonRows count={5} cols={5} />}
              {rows && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">ยังไม่มีพนักงาน</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
