'use client';

import { useEffect } from 'react';

export default function AutoDismissSuccess({
  message,
  durationMs = 1500,
  onDone,
}: {
  message: string;
  durationMs?: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="success-backdrop fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="success-card w-full max-w-xs rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="success-circle mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg viewBox="0 0 24 24" className="h-10 w-10">
            <path
              className="success-check"
              d="M5 13l4 4L19 7"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-800">{message}</p>
      </div>
    </div>
  );
}
