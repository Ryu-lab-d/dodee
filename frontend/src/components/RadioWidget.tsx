'use client';

import { useState } from 'react';
import { Radio, Mic, X } from 'lucide-react';
import { useRadio } from '@/lib/radio';
import { useAuth } from '@/lib/auth';

export default function RadioWidget() {
  const { user } = useAuth();
  const { connected, online, talkingUser, isMine, busyMessage, micError, startTalking, stopTalking } = useRadio();
  const [open, setOpen] = useState(false);

  const others = online.filter((m) => m.id !== user?.id);
  const somebodyElseTalking = !!talkingUser && !isMine;

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 z-30 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl md:bottom-6">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio size={18} className="text-cyan-700" />
              <span className="text-sm font-semibold text-slate-900">วิทยุสื่อสาร</span>
              <span
                className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-300'}`}
                title={connected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}
              />
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          {others.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {others.map((m) => {
                const talking = talkingUser?.userId === m.id;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs ${
                      talking ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${talking ? 'animate-pulse bg-red-500' : 'bg-slate-300'}`} />
                    {m.name}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-3 text-xs text-slate-400">ยังไม่มีเพื่อนร่วมงานคนอื่นออนไลน์</p>
          )}

          <div className="mb-3 min-h-[1.25rem] text-center text-xs font-medium">
            {busyMessage ? (
              <span className="text-amber-600">{busyMessage}</span>
            ) : micError ? (
              <span className="text-red-600">{micError}</span>
            ) : isMine ? (
              <span className="text-red-600">กำลังพูด...</span>
            ) : somebodyElseTalking ? (
              <span className="text-red-600">{talkingUser?.name} กำลังพูดอยู่</span>
            ) : (
              <span className="text-slate-400">ช่องว่าง</span>
            )}
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              startTalking();
            }}
            onPointerUp={stopTalking}
            onPointerLeave={stopTalking}
            onPointerCancel={stopTalking}
            disabled={!connected}
            className={`flex w-full touch-none select-none items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 ${
              isMine ? 'bg-red-600' : 'bg-cyan-700 active:bg-cyan-800'
            }`}
          >
            <Mic size={18} />
            {isMine ? 'กำลังส่ง - ปล่อยเพื่อหยุด' : 'กดค้างเพื่อพูด'}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors md:bottom-6 ${
          talkingUser ? 'bg-red-600' : 'bg-cyan-700'
        } text-white`}
      >
        <Radio size={24} className={talkingUser ? 'animate-pulse' : ''} />
      </button>
    </>
  );
}
