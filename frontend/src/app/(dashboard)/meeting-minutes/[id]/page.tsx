'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { MeetingMinute } from '@/lib/types';

export default function MeetingMinuteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [minute, setMinute] = useState<MeetingMinute | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<MeetingMinute>(`/meeting-minutes/${id}`).then(setMinute).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!minute) return <p className="text-sm text-slate-400">กำลังโหลด...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/meeting-minutes" className="mb-4 inline-block text-sm text-blue-600 hover:text-blue-700">
        ← กลับไปหน้ารายการบันทึกการประชุม
      </Link>

      <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <h1 className="text-lg font-semibold text-slate-900">{minute.title || 'บันทึกการประชุม'}</h1>
          <span className="whitespace-nowrap text-xs text-slate-400">{minute.recordDate}</span>
        </div>
        <p className="mb-4 text-sm text-slate-500">บันทึกโดย {minute.recordedByName}</p>

        {minute.location && (
          <p className="mb-1 text-sm text-slate-600">
            <span className="text-slate-400">สถานที่:</span> {minute.location}
          </p>
        )}
        {minute.attendees && (
          <p className="mb-3 text-sm text-slate-600">
            <span className="text-slate-400">ผู้เข้าร่วม:</span> {minute.attendees}
          </p>
        )}

        <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">{minute.content}</p>

        {minute.details.length > 0 && (
          <dl className="divide-y divide-slate-100 border-t border-slate-100 pt-3">
            {minute.details.map((d, idx) => (
              <div key={idx} className="flex justify-between py-1.5 text-sm">
                <dt className="text-slate-500">{d.label}</dt>
                <dd className="text-slate-900">{d.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="mt-4 text-xs text-slate-400">ส่งถึง {minute.recipientIds.length} คน</p>
      </div>
    </div>
  );
}
