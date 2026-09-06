'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSplashGate } from '@/lib/useSplashGate';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const showSplash = useSplashGate(loading);

  useEffect(() => {
    if (showSplash) return;
    router.replace(user ? '/dashboard' : '/login');
  }, [showSplash, user, router]);

  return <LoadingScreen />;
}
