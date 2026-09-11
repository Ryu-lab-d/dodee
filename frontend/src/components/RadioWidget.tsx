'use client';

import { useState } from 'react';
import { Radio, Mic, X, Siren, PhoneCall } from 'lucide-react';
import { useRadio, RadioMember } from '@/lib/radio';
import { useAuth } from '@/lib/auth';

function holdHandlers(onStart: () => void, onStop: () => void) {
  return {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      // Capture the pointer so a finger/cursor drifting off the button mid-press (very easy
      // on a small hold-to-talk button) doesn't cut the transmission short - only an actual
      // release ends it now.
      e.currentTarget.setPointerCapture(e.pointerId);
      onStart();
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      onStop();
    },
    onPointerCancel: onStop,
  };
}

export default function RadioWidget() {
  const { user } = useAuth();
  const {
    connected,
    online,
    talkingUser,
    isMine,
    isCalledByPrivate,
    busyMessage,
    notice,
    micError,
    selectedTarget,
    selectTarget,
    startTalking,
    startEmergency,
    stopTalking,
  } = useRadio();
  const [open, setOpen] = useState(false);

  const others = online.filter((m) => m.id !== user?.id);
  const somebodyElseTalking = !!talkingUser && !isMine;
  const emergencyActive = talkingUser?.mode === 'emergency';

  // The live channel status (who's talking right now, if anyone) is always shown - a
  // transient notice (busy tone, mic error, "you got preempted") stacks above it instead
  // of replacing it, so getting bumped off the channel doesn't also hide who bumped you.
  const noticeLine = () => {
    if (notice) return <span className="text-amber-600">{notice}</span>;
    if (busyMessage) return <span className="text-amber-600">{busyMessage}</span>;
    if (micError) return <span className="text-red-600">{micError}</span>;
    return null;
  };

  const liveStatusLine = () => {
    if (isMine) {
      const label =
        talkingUser?.mode === 'emergency'
          ? '🚨 กำลังเรียกฉุกเฉิน...'
          : talkingUser?.mode === 'private'
            ? `กำลังคุยกับ ${talkingUser.targetName}...`
            : 'กำลังพูด...';
      return <span className="font-semibold text-red-600">{label}</span>;
    }
    if (somebodyElseTalking) {
      if (talkingUser?.mode === 'emergency') {
        return <span className="font-semibold text-red-600">🚨 {talkingUser.name} กำลังเรียกฉุกเฉิน!</span>;
      }
      if (talkingUser?.mode === 'private') {
        return isCalledByPrivate ? (
          <span className="font-semibold text-red-600">{talkingUser.name} กำลังโทรหาคุณ</span>
        ) : (
          <span className="text-slate-500">{talkingUser?.name} กำลังคุยกับ {talkingUser?.targetName}</span>
        );
      }
      return <span className="text-red-600">{talkingUser?.name} กำลังพูดอยู่</span>;
    }
    return <span className="text-slate-400">ช่องว่าง</span>;
  };

  const pttLabel = isMine
    ? 'กำลังส่ง - ปล่อยเพื่อหยุด'
    : selectedTarget
      ? `กดค้างเพื่อคุยกับ ${selectedTarget.name}`
      : 'กดค้างเพื่อพูด';

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
              {others.map((m: RadioMember) => {
                const talking = talkingUser?.userId === m.id;
                const selected = selectedTarget?.id === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => selectTarget(selected ? null : m)}
                    title="แตะเพื่อเลือกคุยส่วนตัวกับคนนี้ แตะซ้ำเพื่อยกเลิก"
                    className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs transition-colors ${
                      selected
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700 ring-1 ring-cyan-400'
                        : talking
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${talking ? 'animate-pulse bg-red-500' : 'bg-slate-300'}`} />
                    {m.name}
                    {selected && <PhoneCall size={11} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mb-3 text-xs text-slate-400">ยังไม่มีเพื่อนร่วมงานคนอื่นออนไลน์</p>
          )}
          {selectedTarget && (
            <p className="mb-2 text-center text-[11px] text-cyan-700">
              โหมดคุยส่วนตัวกับ {selectedTarget.name} (แตะชื่ออีกครั้งเพื่อกลับไปพูดทุกคน)
            </p>
          )}

          <div className="mb-3 space-y-0.5 text-center text-xs font-medium">
            {noticeLine() && <div>{noticeLine()}</div>}
            <div className="min-h-[1.25rem]">{liveStatusLine()}</div>
          </div>

          <button
            type="button"
            {...holdHandlers(startTalking, stopTalking)}
            disabled={!connected}
            className={`flex w-full touch-none select-none items-center justify-center gap-2 rounded-xl py-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 ${
              isMine ? 'bg-red-600' : 'bg-cyan-700 active:bg-cyan-800'
            }`}
          >
            <Mic size={18} />
            {pttLabel}
          </button>

          <button
            type="button"
            {...holdHandlers(startEmergency, stopTalking)}
            disabled={!connected}
            className={`mt-2 flex w-full touch-none select-none items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              emergencyActive && isMine
                ? 'border-red-600 bg-red-600 text-white'
                : 'border-red-300 bg-red-50 text-red-700 active:bg-red-100'
            }`}
          >
            <Siren size={15} />
            เรียกฉุกเฉิน (แทรกได้ทันที)
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors md:bottom-6 relative ${
          emergencyActive ? 'bg-red-600' : talkingUser ? 'bg-red-600' : 'bg-cyan-700'
        } text-white`}
      >
        {isCalledByPrivate && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />}
        {emergencyActive ? (
          <Siren size={24} className="animate-pulse" />
        ) : (
          <Radio size={24} className={talkingUser ? 'animate-pulse' : ''} />
        )}
      </button>
    </>
  );
}
