'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth';
import { ORIGIN } from './api';
import { unlockRadioAudio, playKeyDownTone, playKeyUpTone, playBusyTone } from './radioTones';

interface RadioMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
}

interface TalkingUser {
  userId: string;
  name: string;
}

interface RadioContextValue {
  connected: boolean;
  online: RadioMember[];
  talkingUser: TalkingUser | null;
  isMine: boolean;
  busyMessage: string | null;
  micError: string | null;
  startTalking: () => void;
  stopTalking: () => void;
}

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || '';
};

// A held transmission is split into short, independently-decodable clips sent as they're
// recorded (instead of one clip buffered for the whole hold) so the other side starts
// hearing it within ~1s instead of only after the talker releases the button.
const SEGMENT_MS = 1200;

const RadioContext = createContext<RadioContextValue | undefined>(undefined);

export function RadioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const segmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingRef = useRef(false);
  const playQueueRef = useRef<Promise<void>>(Promise.resolve());

  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState<RadioMember[]>([]);
  const [talkingUser, setTalkingUser] = useState<TalkingUser | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

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
  const recordSegment = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
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
  }, [stopStream]);

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
        socketRef.current?.emit('talk:end');
      });
  }, [recordSegment]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('dodee_token');
    if (!token) return;

    const socket = io(ORIGIN, { path: '/radio', auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('presence', (list: RadioMember[]) => setOnline(list));
    socket.on('talk:start', (payload: TalkingUser) => setTalkingUser(payload));
    socket.on('talk:end', () => setTalkingUser(null));
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
    };
  }, [user, beginRecording, stopStream]);

  const startTalking = useCallback(() => {
    if (holdingRef.current || !socketRef.current) return;
    holdingRef.current = true;
    setMicError(null);
    unlockRadioAudio();
    playKeyDownTone();
    socketRef.current.emit('talk:request');
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

  return (
    <RadioContext.Provider
      value={{ connected, online, talkingUser, isMine, busyMessage, micError, startTalking, stopTalking }}
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
