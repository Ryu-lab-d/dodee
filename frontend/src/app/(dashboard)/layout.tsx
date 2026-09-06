'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSplashGate } from '@/lib/useSplashGate';
import TopNav from '@/components/TopNav';
import MobileTabBar from '@/components/MobileTabBar';
import LoadingScreen from '@/components/LoadingScreen';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const showSplash = useSplashGate(loading);

  useEffect(() => {
    if (!showSplash && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [showSplash, user, router, pathname]);

  if (showSplash || !user) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      <MobileTabBar />
    </div>
  );
}
