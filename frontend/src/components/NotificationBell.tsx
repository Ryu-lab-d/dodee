'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';

interface AppNotification {
  id: string;
  type: 'contract_expiring' | 'payment_overdue' | 'repair_request';
  message: string;
  sentDate: string;
  readStatus: boolean;
}

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hours / 24)} วันที่แล้ว`;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadUnread = () => api.get<{ count: number }>('/notifications/unread-count').then((r) => setUnread(r.count)).catch(() => {});
  const loadList = () => api.get<AppNotification[]>('/notifications').then(setItems).catch(() => {});

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggle = () => {
    if (!open) loadList();
    setOpen((v) => !v);
  };

  const markRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`);
    setItems((list) => list.map((n) => (n.id === id ? { ...n, readStatus: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setItems((list) => list.map((n) => ({ ...n, readStatus: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-blue-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-900">การแจ้งเตือน</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                อ่านทั้งหมด
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.readStatus && markRead(n.id)}
                className={`block w-full border-b border-slate-50 px-4 py-3 text-left text-sm last:border-0 hover:bg-slate-50 ${
                  n.readStatus ? 'text-slate-500' : 'bg-blue-50/50 text-slate-800'
                }`}
              >
                <p className="leading-snug">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{timeAgo(n.sentDate)}</p>
              </button>
            ))}
            {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">ไม่มีการแจ้งเตือน</p>}
          </div>
        </div>
      )}
    </div>
  );
}
