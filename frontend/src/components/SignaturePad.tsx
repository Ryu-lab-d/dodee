'use client';

import { useRef, useState, useEffect } from 'react';

export default function SignaturePad({
  onConfirm,
  onCancel,
  confirming,
}: {
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1d4ed8';
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    setHasDrawn(true);
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const confirm = () => {
    canvasRef.current?.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, 'image/png');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="success-card w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="mb-1 text-base font-semibold text-slate-900">ลงชื่อรับทราบ</h2>
        <p className="mb-4 text-sm text-slate-500">กรุณาเซ็นชื่อของคุณในกรอบด้านล่างเพื่อยืนยันการรับทราบเงื่อนไข</p>

        <canvas
          ref={canvasRef}
          className="h-48 w-full touch-none rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />

        <div className="mt-4 flex gap-2">
          <button type="button"
            onClick={confirm}
            disabled={!hasDrawn || confirming}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {confirming ? 'กำลังบันทึก...' : 'ยืนยันลายเซ็น'}
          </button>
          <button type="button"
            onClick={clear}
            disabled={confirming}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
          >
            ล้าง
          </button>
          <button type="button"
            onClick={onCancel}
            disabled={confirming}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-50"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
