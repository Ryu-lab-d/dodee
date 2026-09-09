'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAttendance } from '@/lib/attendance';
import { api, ApiError } from '@/lib/api';
import { AttendanceRecord } from '@/lib/types';
import AvatarPicker from '@/components/AvatarPicker';
import AutoDismissSuccess from '@/components/AutoDismissSuccess';
import LoadingScreen from '@/components/LoadingScreen';

function useThaiClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const formatThaiTime = (d: Date) =>
  d.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const formatThaiDate = (d: Date) =>
  d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function AttendanceCheckInPage() {
  const { user, loading, refreshUser } = useAuth();
  const { status, loading: attendanceLoading, refresh } = useAttendance();
  const router = useRouter();
  const clock = useThaiClock();
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (loading || attendanceLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'owner' || status?.hasAccess) {
      router.replace('/dashboard');
    }
  }, [loading, attendanceLoading, user, status, router]);

  // Poll every 20s so the screen updates itself the moment the check-in window opens,
  // without the person needing to manually refresh the page.
  useEffect(() => {
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleCheckIn = async () => {
    setError(null);
    setCheckingIn(true);
    try {
      const record = await api.post<AttendanceRecord>('/attendance/check-in');
      setSuccessRecord(record);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'เช็คชื่อเข้างานไม่สำเร็จ');
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading || attendanceLoading || !user || user.role === 'owner' || status?.hasAccess) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-1 justify-center bg-sky-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-5 flex flex-col items-center">
          <Image src="/logo.png" alt="DoDee" width={200} height={145} className="h-14 w-auto" priority />
        </div>

        <div className="card-in rounded-3xl border border-blue-100 bg-white p-6 text-center shadow-sm">
          <AvatarPicker
            avatarUrl={user.avatarUrl}
            onUploaded={async (url) => {
              await api.put('/auth/me/profile', { avatarUrl: url });
              await refreshUser();
            }}
          />
          <h1 className="mt-3 text-lg font-semibold text-slate-900">{user.name}</h1>
          <div className="mt-1 space-y-0.5 text-sm text-slate-500">
            {user.phone && <p>{user.phone}</p>}
            {user.email && <p>{user.email}</p>}
          </div>

          <div className="my-5 rounded-2xl bg-slate-50 py-4">
            <p className="text-2xl font-bold tabular-nums text-slate-900">{formatThaiTime(clock)} น.</p>
            <p className="mt-0.5 text-xs text-slate-400">{formatThaiDate(clock)}</p>
          </div>

          {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          {status?.checkedOutToday ? (
            <>
              <p className="mb-4 text-sm text-slate-600">คุณเช็คชื่อออกงานไปแล้ววันนี้ หากต้องการเข้าถึงข้อมูลนอกเวลาทำงาน กรุณาแจ้งเหตุผลและยืนยันตัวตนอีกครั้ง</p>
              <button
                type="button"
                onClick={() => router.push('/off-hours-access')}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                ขอเข้าถึงข้อมูลนอกเวลา
              </button>
            </>
          ) : status?.beforeWindow ? (
            <>
              <p className="mb-4 text-sm text-slate-600">
                ยังไม่ถึงเวลาเช็คชื่อเข้างาน ระบบจะเปิดให้เช็คชื่อเวลา {status.workStart} น. หากมีความจำเป็นต้องเข้าถึงข้อมูลตอนนี้ สามารถขอเข้าถึงข้อมูลนอกเวลาได้
              </p>
              <button
                type="button"
                onClick={() => router.push('/off-hours-access')}
                className="w-full rounded-xl border border-blue-200 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50"
              >
                ต้องการเข้าถึงข้อมูลตอนนี้
              </button>
            </>
          ) : status?.afterWorkEnd ? (
            <>
              <p className="mb-4 text-sm text-slate-600">
                เลยเวลาทำการปกติแล้ว (หลัง {status.workEnd} น.) ระบบนับเป็นการเข้าถึงข้อมูลนอกเวลาทำการ กรุณาแจ้งเหตุผลและยืนยันตัวตน
              </p>
              <button
                type="button"
                onClick={() => router.push('/off-hours-access')}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                เช็คชื่อหลังเวลาทำการปกติ
              </button>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                กรุณาเช็คชื่อเข้างานเพื่อเริ่มใช้งานระบบ
                {status && status.now && ' '}
                (ช่วงเวลาปกติ {status?.workStart}-{status?.lateAfter} น.)
              </p>
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {checkingIn ? 'กำลังเช็คชื่อ...' : 'เช็คชื่อเข้างาน'}
              </button>
            </>
          )}
        </div>
      </div>

      {successRecord && (
        <AutoDismissSuccess
          message={
            successRecord.checkInLateMinutes && successRecord.checkInLateMinutes > 0
              ? `เช็คชื่อเข้างานสำเร็จ - สาย ${successRecord.checkInLateMinutes} นาที`
              : 'เช็คชื่อเข้างานสำเร็จ - ตรงเวลา'
          }
          durationMs={1800}
          onDone={async () => {
            await refresh();
            router.replace('/dashboard');
          }}
        />
      )}
    </div>
  );
}
