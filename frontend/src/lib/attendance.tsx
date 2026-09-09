'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './auth';
import { api } from './api';
import { AttendanceStatus } from './types';

interface AttendanceContextValue {
  status: AttendanceStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextValue | undefined>(undefined);

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<AttendanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || user.role === 'owner') {
      setStatus(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<AttendanceStatus>('/attendance/status');
      setStatus(res);
    } catch {
      // Leave stale status in place - a transient network error here shouldn't bounce
      // someone who is already inside the app back out to the gate screen.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <AttendanceContext.Provider value={{ status, loading, refresh }}>{children}</AttendanceContext.Provider>;
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used within AttendanceProvider');
  return ctx;
}
