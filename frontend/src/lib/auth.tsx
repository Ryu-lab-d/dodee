'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, redirectTo?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await api.get<User>('/auth/me');
      setUser(fresh);
      localStorage.setItem('dodee_user', JSON.stringify(fresh));
    } catch {
      // token invalid/expired - api.ts already clears storage on 401
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('dodee_user');
    const token = localStorage.getItem('dodee_token');
    if (stored && token) {
      setUser(JSON.parse(stored));
      // Cached user may be stale (e.g. missing fields set after login, like LINE link status)
      // so always re-validate against the server once on load.
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string, redirectTo?: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { username, password });
    localStorage.setItem('dodee_token', res.token);
    localStorage.setItem('dodee_user', JSON.stringify(res.user));
    setUser(res.user);
    // Login only returns a minimal user shape - fetch the full profile (role/terms/etc)
    // before deciding where to send them, so first-time employees land on /terms directly.
    await refreshUser();
    const fresh = JSON.parse(localStorage.getItem('dodee_user') || 'null') as User | null;
    if (fresh && fresh.role !== 'owner' && !fresh.termsAcceptedAt) {
      router.push('/terms');
    } else {
      router.push(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard');
    }
  };

  const logout = () => {
    localStorage.removeItem('dodee_token');
    localStorage.removeItem('dodee_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
