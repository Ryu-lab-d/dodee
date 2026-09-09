'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAttendance } from '@/lib/attendance';
import { useSplashGate } from '@/lib/useSplashGate';
import TopNav from '@/components/TopNav';
import MobileTabBar from '@/components/MobileTabBar';
import LoadingScreen from '@/components/LoadingScreen';
import { AttendanceStatus } from '@/lib/types';

// Owner accounts don't need the employee onboarding/terms flow.
const needsTerms = (user: { role: string; termsAcceptedAt?: string | null } | null) =>
  !!user && user.role !== 'owner' && !user.termsAcceptedAt;

// Non-owner accounts must check in for work today before seeing any dashboard content.
// (This is a UX convenience redirect - the real enforcement is server-side on every
// request, so a stale/unfetched status here fails open rather than false-locking someone.)
const needsAttendanceCheckIn = (user: { role: string } | null, status: AttendanceStatus | null) =>
  !!user && user.role !== 'owner' && !!status && !status.hasAccess;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { status, loading: attendanceLoading } = useAttendance();
  const router = useRouter();
  const pathname = usePathname();
  const showSplash = useSplashGate(loading || attendanceLoading);

  useEffect(() => {
    if (showSplash) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (needsTerms(user)) {
      router.replace('/terms');
    } else if (needsAttendanceCheckIn(user, status)) {
      router.replace('/attendance-check-in');
    }
  }, [showSplash, user, status, router, pathname]);

  if (showSplash || !user || needsTerms(user) || needsAttendanceCheckIn(user, status)) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopNav />
      <main key={pathname} className="page-fade-in mx-auto w-full max-w-6xl flex-1 p-4 pb-24 md:p-6 md:pb-6">
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}
