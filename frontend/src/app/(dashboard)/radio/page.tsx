'use client';

import { useEffect } from 'react';
import { Mic, PhoneCall, Radio as RadioIcon, Siren, History } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRadio, RadioMember } from '@/lib/radio';

const ROLE_LABEL: Record<string, string> = {
  owner: 'เจ้าของ',
  admin: 'แอดมิน',
  manager: 'ผู้จัดการ',
};

function holdHandlers(onStart: () => void, onStop: () => void) {
  return {
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
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

function MemberCard({
  member,
  isSelf,
  talking,
  selected,
  onClick,
}: {
  member: RadioMember;
  isSelf: boolean;
  talking: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const initial = member.name?.trim()?.[0] || '?';
  return (
    <button
      type="button"
      disabled={isSelf}
      onClick={onClick}
      title={isSelf ? undefined : 'แตะเพื่อเลือกคุยส่วนตัวกับคนนี้ แตะซ้ำเพื่อยกเลิก'}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
        selected
          ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-300'
          : talking
            ? 'border-red-300 bg-red-50'
            : 'border-slate-200 bg-white hover:border-slate-300'
      } ${isSelf ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
    >
      <span
        className={`relative flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white ${
          talking ? 'bg-red-500' : 'bg-gradient-to-br from-cyan-500 to-blue-600'
        }`}
      >
        {talking && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />}
        {initial}
      </span>
      <div className="text-center">
        <p className="text-sm font-medium text-slate-900">
          {member.name}
          {isSelf && <span className="text-slate-400"> (คุณ)</span>}
        </p>
        <p className="text-[11px] text-slate-400">{ROLE_LABEL[member.role] || member.role}</p>
      </div>
      {selected && (
        <span className="flex items-center gap-1 rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-medium text-white">
          <PhoneCall size={10} /> เลือกคุยส่วนตัว
        </span>
      )}
    </button>
  );
}

export default function RadioPage() {
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
    recentEvents,
    markSeen,
  } = useRadio();

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  const others = online.filter((m) => m.id !== user?.id);
  const somebodyElseTalking = !!talkingUser && !isMine;
  const emergencyActive = talkingUser?.mode === 'emergency';

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
          <span className="text-slate-500">
            {talkingUser?.name} กำลังคุยกับ {talkingUser?.targetName}
          </span>
        );
      }
      return <span className="text-red-600">{talkingUser?.name} กำลังพูดอยู่</span>;
    }
    return <span className="text-slate-400">ช่องว่าง - พร้อมใช้งาน</span>;
  };

  const pttLabel = isMine
    ? 'กำลังส่ง - ปล่อยเพื่อหยุด'
    : selectedTarget
      ? `กดค้างเพื่อคุยกับ ${selectedTarget.name}`
      : 'กดค้างเพื่อพูด';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <RadioIcon className="text-cyan-700" size={22} />
            วิทยุสื่อสาร
          </h1>
          <p className="text-sm text-slate-500">พูดคุยกับเพื่อนร่วมงานแบบสด ๆ เหมือนวิทยุสื่อสารจริง</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-300'}`} />
          {connected ? 'เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ'}
        </span>
      </div>

      <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-medium text-slate-500">
          ผู้ที่ออนไลน์ ({online.length}) - แตะชื่อเพื่อนร่วมงานเพื่อคุยส่วนตัว
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {user && (
            <MemberCard
              member={{ id: user.id, name: user.name, role: user.role, avatarUrl: user.avatarUrl }}
              isSelf
              talking={isMine}
              selected={false}
              onClick={() => {}}
            />
          )}
          {others.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              isSelf={false}
              talking={talkingUser?.userId === m.id}
              selected={selectedTarget?.id === m.id}
              onClick={() => selectTarget(selectedTarget?.id === m.id ? null : m)}
            />
          ))}
        </div>
        {others.length === 0 && <p className="mt-1 text-center text-xs text-slate-400">ยังไม่มีเพื่อนร่วมงานคนอื่นออนไลน์</p>}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-1 text-center">
          {noticeLine() && <div className="text-sm font-medium">{noticeLine()}</div>}
          <div className="text-base font-medium">{liveStatusLine()}</div>
          {selectedTarget && !isMine && (
            <p className="text-xs text-cyan-700">
              โหมดคุยส่วนตัวกับ {selectedTarget.name} (แตะชื่ออีกครั้งด้านบนเพื่อกลับไปพูดทุกคน)
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-6">
          <button
            type="button"
            {...holdHandlers(startTalking, stopTalking)}
            disabled={!connected}
            className={`flex h-40 w-40 touch-none select-none flex-col items-center justify-center gap-2 rounded-full text-white shadow-xl transition-all disabled:cursor-not-allowed disabled:bg-slate-300 ${
              isMine ? 'scale-105 bg-red-600 shadow-red-200' : 'bg-cyan-700 shadow-cyan-200 active:scale-95 active:bg-cyan-800'
            }`}
          >
            <Mic size={36} />
            <span className="px-3 text-center text-xs font-semibold leading-tight">{pttLabel}</span>
          </button>

          <div className="w-full max-w-sm border-t border-dashed border-red-200 pt-5">
            <p className="mb-2 text-center text-[11px] font-medium text-red-400">โซนฉุกเฉิน - แทรกช่องสัญญาณได้ทันที</p>
            <button
              type="button"
              {...holdHandlers(startEmergency, stopTalking)}
              disabled={!connected}
              className={`flex w-full touch-none select-none items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                emergencyActive && isMine
                  ? 'border-red-600 bg-red-600 text-white'
                  : 'border-red-300 bg-red-50 text-red-700 active:bg-red-100'
              }`}
            >
              <Siren size={18} />
              กดค้างเพื่อเรียกฉุกเฉิน
            </button>
          </div>
        </div>
      </div>

      {recentEvents.length > 0 && (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <History size={14} /> กิจกรรมล่าสุด
          </p>
          <div className="space-y-2">
            {recentEvents.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-slate-50 pb-2 text-sm last:border-0">
                <p className="text-slate-700">
                  {e.mode === 'emergency' && <span className="mr-1">🚨</span>}
                  <span className="font-medium text-slate-900">{e.name}</span>{' '}
                  {e.mode === 'emergency'
                    ? 'เรียกฉุกเฉิน'
                    : e.mode === 'private'
                      ? `โทรหา ${e.targetName}`
                      : 'พูดในช่องทั่วไป'}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(e.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
