'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth';
import { ORIGIN } from './api';
import {
  unlockRadioAudio,
  playKeyDownTone,
  playKeyUpTone,
  playBusyTone,
  playEmergencyTone,
  vibrateEmergency,
} from './radioTones';

export interface RadioMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

type TalkMode = 'broadcast' | 'private' | 'emergency';

interface TalkingUser {
  userId: string;
  name: string;
  mode: TalkMode;
  targetUserId?: string;
  targetName?: string;
}

export interface RecentRadioEvent {
  id: string;
  userId: string;
  name: string;
  mode: TalkMode;
  targetUserId?: string;
  targetName?: string;
  at: number;
}

interface RadioContextValue {
  connected: boolean;
  online: RadioMember[];
  talkingUser: TalkingUser | null;
  isMine: boolean;
  isCalledByPrivate: boolean;
  busyMessage: string | null;
  notice: string | null;
  micError: string | null;
  selectedTarget: RadioMember | null;
  selectTarget: (member: RadioMember | null) => void;
  startTalking: () => void;
  startEmergency: () => void;
  stopTalking: () => void;
  recentEvents: RecentRadioEvent[];
  missedCount: number;
  markSeen: () => void;
}

const RECENT_EVENTS_LIMIT = 15;

// A transmission is "for me" if I could plausibly have wanted to hear it - broadcasts and
// emergencies reach everyone, a private call only reaches its actual target.
const isForMe = (payload: TalkingUser, myId?: string) =>
  payload.mode === 'private' ? payload.targetUserId === myId : true;

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

// A held transmission is split into short, independently-decodable clips sent as they're
// recorded (instead of one clip buffered for the whole hold) so the other side starts
// hearing it almost immediately instead of only after the talker releases the button.
// Shorter segments cut first-audio latency further but add per-clip container overhead -
// 400ms is close to the floor where MediaRecorder segment restarts stay reliable.
const SEGMENT_MS = 400;

const RadioContext = createContext<RadioContextValue | undefined>(undefined);

export function RadioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingRef = useRef(false);
  const abortRef = useRef(false);
  const playQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState<RadioMember[]>([]);
  const [talkingUser, setTalkingUser] = useState<TalkingUser | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<RadioMember | null>(null);
  const selectedTargetRef = useRef<RadioMember | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentRadioEvent[]>([]);
  const [missedCount, setMissedCount] = useState(0);
  const titleFlashRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string | null>(null);

  const markSeen = useCallback(() => {
    setMissedCount(0);
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const stopTitleFlash = useCallback(() => {
    if (titleFlashRef.current) clearInterval(titleFlashRef.current);
    titleFlashRef.current = null;
    if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current;
      originalTitleRef.current = null;
    }
  }, []);

  const selectTarget = useCallback((member: RadioMember | null) => {
    selectedTargetRef.current = member;
    setSelectedTarget(member);
  }, []);

  // Drop the selection if that person leaves the channel entirely.
  useEffect(() => {
    if (selectedTarget && !online.some((m) => m.id === selectedTarget.id)) {
      selectTarget(null);
    }
  }, [online, selectedTarget, selectTarget]);

  // Clear a flashing tab title the moment the tab is looked at again, even mid-flash.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) stopTitleFlash();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [stopTitleFlash]);

  const stopStream = useCallback(() => {
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
    segmentTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  // Records one short segment at a time from the already-open mic stream. Each segment is
  // its own self-contained clip (with its own container header) sent as soon as it's ready,
  // then immediately followed by the next segment - until the button is released, at which
  // point the in-flight segment is flushed as the final one instead of starting another.
  const recordSegment = useCallback(
    (stream: MediaStream) => {
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (abortRef.current) {
          // Preempted by an emergency call, or the private-call target went offline -
          // the server has already moved on, so there's nothing useful to send.
          abortRef.current = false;
          stopStream();
          return;
        }
        if (blob.size > 0) {
          const buffer = await blob.arrayBuffer();
          socketRef.current?.emit('talk:audio', { data: buffer, mimeType: recorder.mimeType || 'audio/webm' });
        }
        if (holdingRef.current && streamRef.current) {
          recordSegment(streamRef.current);
        } else {
          stopStream();
          socketRef.current?.emit('talk:end');
        }
      };
      recorder.start();
      segmentTimerRef.current = setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state === 'recording') recorder.stop();
      }, SEGMENT_MS);
    },
    [stopStream]
  );

  const beginRecording = useCallback(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (!holdingRef.current) {
          // Released before the mic was ready - give up the channel without sending anything.
          stream.getTracks().forEach((track) => track.stop());
          socketRef.current?.emit('talk:end');
          return;
        }
        streamRef.current = stream;
        recordSegment(stream);
      })
      .catch(() => {
        setMicError('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งานไมโครโฟน');
        holdingRef.current = false;
        socketRef.current?.emit('talk:end');
      });
  }, [recordSegment]);

  // Stops the mic immediately without letting the in-flight segment send - used when the
  // server tells us our channel hold is no longer valid (preempted, or nobody's listening).
  const hardStop = useCallback(
    (message: string, playTone: () => void) => {
      abortRef.current = true;
      holdingRef.current = false;
      if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      } else {
        stopStream();
      }
      playTone();
      setNotice(message);
      setTimeout(() => setNotice(null), 3000);
    },
    [stopStream]
  );

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('dodee_token');
    if (!token) return;

    const socket = io(ORIGIN, { path: '/radio', auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('presence', (list: RadioMember[]) => setOnline(list));
    socket.on('talk:start', (payload: TalkingUser) => {
      setTalkingUser(payload);
      setRecentEvents((prev) =>
        [{ id: `${payload.userId}-${Date.now()}`, ...payload, at: Date.now() }, ...prev].slice(0, RECENT_EVENTS_LIMIT)
      );

      const forMe = payload.userId !== user.id && isForMe(payload, user.id);
      if (!forMe) return;
      setMissedCount((c) => c + 1);

      if (document.hidden) {
        const alertLabel =
          payload.mode === 'emergency'
            ? `🚨 ${payload.name} เรียกฉุกเฉิน!`
            : payload.mode === 'private'
              ? `📻 ${payload.name} กำลังโทรหาคุณ`
              : `📻 ${payload.name} กำลังพูด`;

        if (!titleFlashRef.current) {
          originalTitleRef.current = document.title;
          let flashOn = true;
          document.title = alertLabel; // show it immediately - a short "ping" transmission
          // can end before the first setInterval tick would otherwise ever fire.
          titleFlashRef.current = setInterval(() => {
            flashOn = !flashOn;
            document.title = flashOn ? alertLabel : originalTitleRef.current || document.title;
          }, 1000);
        }

        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(alertLabel, { body: 'แตะเพื่อเปิดแอป DoDee', tag: 'dodee-radio' });
          } catch {
            // Notification construction can throw in some contexts (e.g. no service worker
            // on iOS) - the tab-title flash above already covers the alert either way.
          }
        }
      }
    });
    socket.on('talk:end', () => {
      setTalkingUser(null);
      stopTitleFlash();
    });
    socket.on('talk:granted', () => {
      if (holdingRef.current) beginRecording();
      else socket.emit('talk:end');
    });
    socket.on('talk:busy', ({ name }: { name: string }) => {
      holdingRef.current = false;
      playBusyTone();
      setBusyMessage(`ช่องไม่ว่าง - ${name} กำลังพูดอยู่`);
      setTimeout(() => setBusyMessage(null), 2000);
    });
    socket.on('talk:preempted', () => hardStop('การเรียกของคุณถูกแทรกโดยสายฉุกเฉิน', playBusyTone));
    socket.on('talk:target-offline', () => hardStop('ผู้รับสายไม่ได้ออนไลน์แล้ว', playBusyTone));
    socket.on('talk:audio', ({ data, mimeType }: { data: ArrayBuffer; mimeType?: string }) => {
      // Segments are queued and played back-to-back (not fired off in parallel) so a fast
      // run of short clips from one transmission still sounds like one continuous voice.
      playQueueRef.current = playQueueRef.current.then(
        () =>
          new Promise<void>((resolve) => {
            const blob = new Blob([data], { type: mimeType || 'audio/webm' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            const cleanup = () => {
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onended = cleanup;
            audio.onerror = cleanup;
            audio.play().catch(cleanup);
          })
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      stopStream();
      stopTitleFlash();
    };
  }, [user, beginRecording, stopStream, hardStop, stopTitleFlash]);

  const startTalking = useCallback(() => {
    if (holdingRef.current || !socketRef.current) return;
    holdingRef.current = true;
    setMicError(null);
    unlockRadioAudio();
    playKeyDownTone();
    const target = selectedTargetRef.current;
    socketRef.current.emit('talk:request', target ? { targetUserId: target.id } : {});
  }, []);

  const startEmergency = useCallback(() => {
    if (holdingRef.current || !socketRef.current) return;
    holdingRef.current = true;
    setMicError(null);
    unlockRadioAudio();
    playEmergencyTone();
    vibrateEmergency();
    socketRef.current.emit('talk:request', { emergency: true });
  }, []);

  const stopTalking = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    playKeyUpTone();
    if (segmentTimerRef.current) clearTimeout(segmentTimerRef.current);
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
    }
  }, []);

  const isMine = !!talkingUser && !!user && talkingUser.userId === user.id;
  const isCalledByPrivate =
    !!talkingUser && talkingUser.mode === 'private' && !!user && talkingUser.targetUserId === user.id;

  return (
    <RadioContext.Provider
      value={{
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
        missedCount,
        markSeen,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error('useRadio must be used within RadioProvider');
  return ctx;
}
