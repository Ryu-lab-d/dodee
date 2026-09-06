'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import SignaturePad from '@/components/SignaturePad';
import AutoDismissSuccess from '@/components/AutoDismissSuccess';
import LoadingScreen from '@/components/LoadingScreen';

type Stage = 'loading' | 'reading' | 'signing' | 'success' | 'transitioning';

function TermsBody({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;
        if (/^\d+\.\d+\s/.test(trimmed)) {
          return (
            <p key={idx} className="pt-2 text-sm font-semibold text-slate-800">
              {trimmed}
            </p>
          );
        }
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <p key={idx} className="border-t border-slate-100 pt-4 text-base font-bold text-blue-700 first:border-0 first:pt-0">
              {trimmed}
            </p>
          );
        }
        if (/^[-*]\s/.test(trimmed)) {
          return (
            <p key={idx} className="pl-4 text-sm leading-relaxed text-slate-600">
              • {trimmed.replace(/^[-*]\s/, '')}
            </p>
          );
        }
        if (/^".+"\s+หมายถึง/.test(trimmed)) {
          return (
            <p key={idx} className="text-sm leading-relaxed text-slate-700">
              {trimmed}
            </p>
          );
        }
        return (
          <p key={idx} className="text-sm leading-relaxed text-slate-600">
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function TermsPage() {
  const { user, loading, refreshUser, logout } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('loading');
  const [terms, setTerms] = useState<{ version: string; text: string } | null>(null);
  const [checkedRead, setCheckedRead] = useState(false);
  const [checkedUnderstood, setCheckedUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'owner' || user.termsAcceptedAt) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user || user.role === 'owner' || user.termsAcceptedAt) return;
    api
      .get<{ version: string; text: string }>('/auth/terms')
      .then((t) => {
        setTerms(t);
        setStage('reading');
      })
      .catch((err) => setError(err.message));
  }, [loading, user]);

  const handleSign = async (blob: Blob) => {
    setConfirming(true);
    setError(null);
    try {
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const { url } = await api.upload(file);
      await api.put('/auth/accept-terms', { signatureUrl: url });
      await refreshUser();
      setStage('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกลายเซ็นไม่สำเร็จ');
    } finally {
      setConfirming(false);
    }
  };

  if (stage === 'loading' || !terms) {
    return <LoadingScreen />;
  }

  if (stage === 'transitioning') {
    return <LoadingScreen message="กำลังพาคุณไปยังความสะดวกสบาย..." />;
  }

  return (
    <div className="flex flex-1 justify-center bg-sky-50 px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-5 flex flex-col items-center">
          <Image src="/logo.png" alt="DoDee" width={200} height={145} className="h-16 w-auto" priority />
          <p className="mt-2 text-sm text-slate-500">ยินดีต้อนรับ, {user?.name}</p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">เงื่อนไขการใช้งาน</h1>
          <p className="mb-4 text-sm text-slate-500">กรุณาอ่านเงื่อนไขทั้งหมดก่อนเริ่มใช้งานระบบ (ฉบับที่ {terms.version})</p>

          <div className="max-h-96 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <TermsBody text={terms.text} />
          </div>

          {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="mt-5 space-y-3">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={checkedRead}
                onChange={(e) => setCheckedRead(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              ฉันได้อ่านเงื่อนไขการบริการของ Do Dee ทั้งหมดครบถ้วน
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={checkedUnderstood}
                onChange={(e) => setCheckedUnderstood(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              ฉันเข้าใจและยืนยันที่จะรับทราบเงื่อนไขการบริการ
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStage('signing')}
              disabled={!checkedRead || !checkedUnderstood}
              className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ยอมรับ
            </button>
            <button
              onClick={logout}
              className="rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-slate-50"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>

      {stage === 'signing' && (
        <SignaturePad onConfirm={handleSign} onCancel={() => setStage('reading')} confirming={confirming} />
      )}

      {stage === 'success' && (
        <AutoDismissSuccess
          message="รับทราบเงื่อนไขการใช้งานเรียบร้อยแล้ว"
          onDone={() => {
            setStage('transitioning');
            setTimeout(() => router.replace('/dashboard'), 1900);
          }}
        />
      )}
    </div>
  );
}
