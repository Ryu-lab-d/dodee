'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { TriangleAlert, CircleHelp } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red/destructive styling. Defaults to true since most confirmations here are deletes. */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | undefined>(undefined);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
  closing: boolean;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirmFn = useCallback<ConfirmFn>((options) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setPending({ options: opts, resolve, closing: false });
    });
  }, []);

  const settle = (result: boolean) => {
    if (!pending) return;
    pending.resolve(result);
    // Play the exit animation before unmounting instead of just vanishing.
    setPending((p) => (p ? { ...p, closing: true } : p));
    setTimeout(() => setPending(null), 150);
  };

  const danger = pending?.options.danger !== false;

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      {pending && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 ${
            pending.closing ? 'confirm-backdrop-out' : 'confirm-backdrop-in'
          }`}
          onClick={() => settle(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl ${
              pending.closing ? 'confirm-card-out' : 'confirm-card-in'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  danger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
                }`}
              >
                {danger ? <TriangleAlert className="h-5 w-5" /> : <CircleHelp className="h-5 w-5" />}
              </span>
              <div className="pt-1">
                {pending.options.title && <h3 className="text-sm font-semibold text-slate-900">{pending.options.title}</h3>}
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{pending.options.message}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                {pending.options.cancelLabel || 'ยกเลิก'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white ${
                  danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {pending.options.confirmLabel || (danger ? 'ลบ' : 'ยืนยัน')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
