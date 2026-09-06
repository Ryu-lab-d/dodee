'use client';

import { Suspense, useState, FormEvent } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';

function LoginForm() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || undefined;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password, next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`card-in w-full max-w-sm rounded-2xl border border-blue-100 bg-white p-8 shadow-sm ${error ? 'shake-x' : ''}`}
    >
      <div className="fade-up mb-4 flex justify-center">
        <Image src="/logo.png" alt="DoDee" width={200} height={145} className="h-16 w-auto" priority />
      </div>
      <p className="fade-up mb-6 text-center text-sm text-slate-500" style={{ animationDelay: '80ms' }}>
        ระบบจัดการหอพัก / บ้านเช่า / คอนโด
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="fade-up" style={{ animationDelay: '140ms' }}>
        <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อผู้ใช้</label>
        <input
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-shadow focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div className="fade-up" style={{ animationDelay: '200ms' }}>
        <label className="mb-1 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
        <input
          type="password"
          className="mb-6 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-shadow focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="fade-up w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        style={{ animationDelay: '260ms' }}
      >
        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gradient-to-b from-sky-100 to-sky-50 p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
