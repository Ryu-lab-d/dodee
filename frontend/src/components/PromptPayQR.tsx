'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildPromptPayPayload } from '@/lib/promptpay';

export default function PromptPayQR({ promptpayId, amount }: { promptpayId: string; amount?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const payload = buildPromptPayPayload(promptpayId, amount);
    if (!payload) {
      setDataUrl(null);
      return;
    }
    QRCode.toDataURL(payload, { margin: 1, width: 200 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [promptpayId, amount]);

  if (!dataUrl) return null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="PromptPay QR" width={160} height={160} className="rounded-lg border border-slate-200 p-1.5" />
      <p className="text-xs font-medium text-slate-600">สแกนจ่ายผ่าน PromptPay</p>
      {amount !== undefined && <p className="text-xs text-slate-400">฿{amount.toLocaleString()}</p>}
    </div>
  );
}
