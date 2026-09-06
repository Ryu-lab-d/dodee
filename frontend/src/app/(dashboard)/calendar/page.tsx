'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, FileClock, Receipt, NotebookPen, Gauge } from 'lucide-react';
import { api } from '@/lib/api';
import { CalendarEvent, CalendarEventType } from '@/lib/types';

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const EVENT_META: Record<CalendarEventType, { label: string; dot: string; badge: string; icon: typeof FileClock }> = {
  contract_end: { label: 'สัญญาหมดอายุ', dot: 'bg-red-500', badge: 'bg-red-50 text-red-600', icon: FileClock },
  invoice_due: { label: 'ครบกำหนดชำระ', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700', icon: Receipt },
  meeting: { label: 'บันทึกการประชุม', dot: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700', icon: NotebookPen },
  meter_reading: { label: 'จดมิเตอร์น้ำ-ไฟ', dot: 'bg-teal-500', badge: 'bg-teal-50 text-teal-700', icon: Gauge },
};

const toKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState(() => toKey(today));
  const [error, setError] = useState<string | null>(null);

  const monthParam = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    api
      .get<CalendarEvent[]>(`/calendar?month=${monthParam}`)
      .then(setEvents)
      .catch((err) => setError(err.message));
  }, [monthParam]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = firstOfMonth.getDay();
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const changeMonth = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(toKey(today));
  };

  const selectedEvents = eventsByDay.get(selected) || [];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">ปฏิทิน</h1>
          <p className="text-sm text-slate-500">สัญญาหมดอายุ · ครบกำหนดชำระ · บันทึกการประชุม · วันจดมิเตอร์</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => changeMonth(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="w-36 text-center text-sm font-semibold text-slate-900">
            {MONTH_NAMES[cursor.getMonth()]} {cursor.getFullYear() + 543}
          </p>
          <button type="button"
            onClick={() => changeMonth(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button"
            onClick={goToday}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            วันนี้
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="fade-up mb-4 flex flex-wrap gap-4 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-xs text-slate-600">
        {(Object.keys(EVENT_META) as CalendarEventType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${EVENT_META[type].dot}`} />
            {EVENT_META[type].label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="fade-up overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-2 text-center text-xs font-medium text-slate-500">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const key = toKey(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = key === toKey(today);
              const isSelected = key === selected;
              const dayEvents = eventsByDay.get(key) || [];
              const shown = dayEvents.slice(0, 3);

              return (
                <button type="button"
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`flex min-h-20 flex-col items-center gap-1 border-b border-r border-slate-50 p-1.5 text-left transition-colors hover:bg-blue-50/50 sm:min-h-24 sm:items-start sm:p-2 ${
                    isSelected ? 'bg-blue-50' : ''
                  } ${!inMonth ? 'opacity-40' : ''}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday ? 'bg-blue-600 font-semibold text-white' : 'text-slate-700'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-0.5 sm:flex-col sm:gap-1">
                    {shown.map((e) => (
                      <span key={e.id} className={`h-1.5 w-1.5 rounded-full sm:hidden ${EVENT_META[e.type].dot}`} />
                    ))}
                    {shown.map((e) => (
                      <span
                        key={e.id}
                        className={`hidden truncate rounded px-1 py-0.5 text-[9px] sm:block ${EVENT_META[e.type].badge}`}
                      >
                        {EVENT_META[e.type].label}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-slate-400">+{dayEvents.length - 3}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="fade-up rounded-2xl border border-blue-100 bg-white p-4 shadow-sm" style={{ animationDelay: '80ms' }}>
          <p className="mb-3 text-sm font-semibold text-slate-900">
            {new Date(selected).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-400">ไม่มีรายการในวันนี้</p>
          ) : (
            <div className="space-y-2.5">
              {selectedEvents.map((e) => {
                const meta = EVENT_META[e.type];
                const Icon = meta.icon;
                return (
                  <Link
                    key={e.id}
                    href={e.link}
                    className="hover-card flex items-start gap-2.5 rounded-xl border border-slate-100 p-2.5 hover:border-blue-200"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.badge}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">{meta.label}</p>
                      <p className="truncate text-sm text-slate-800">{e.title}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
