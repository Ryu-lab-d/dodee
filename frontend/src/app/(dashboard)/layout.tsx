'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSplashGate } from '@/lib/useSplashGate';
import TopNav from '@/components/TopNav';
import MobileTabBar from '@/components/MobileTabBar';
import LoadingScreen from '@/components/LoadingScreen';

// Owner accounts don't need the employee onboarding/terms flow.
const needsTerms = (user: { role: string; termsAcceptedAt?: string | null } | null) =>
  !!user && user.role !== 'owner' && !user.termsAcceptedAt;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const showSplash = useSplashGate(loading);

  useEffect(() => {
    if (showSplash) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (needsTerms(user)) {
      router.replace('/terms');
    }
  }, [showSplash, user, router, pathname]);

  if (showSplash || !user || needsTerms(user)) {
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
