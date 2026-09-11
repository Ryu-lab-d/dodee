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

const RadioContext = createContext<RadioContextValue | undefined>(undefined);

export function RadioProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const holdingRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState<RadioMember[]>([]);
  const [talkingUser, setTalkingUser] = useState<TalkingUser | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

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
        chunksRef.current = [];
        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          stopStream();
          const buffer = await blob.arrayBuffer();
          socketRef.current?.emit('talk:audio', buffer);
          socketRef.current?.emit('talk:end');
        };
        recorder.start();
      })
      .catch(() => {
        setMicError('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการใช้งานไมโครโฟน');
        socketRef.current?.emit('talk:end');
      });
  }, [stopStream]);

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
    socket.on('talk:audio', ({ data }: { userId: string; name: string; data: ArrayBuffer }) => {
      const blob = new Blob([data], { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.play().catch(() => URL.revokeObjectURL(url));
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
