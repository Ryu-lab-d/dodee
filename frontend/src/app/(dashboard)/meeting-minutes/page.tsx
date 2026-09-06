'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { MeetingMinute, PropertyDetail, User } from '@/lib/types';
import DetailsEditor from '@/components/DetailsEditor';
import MeetingSuccessModal from '@/components/MeetingSuccessModal';
import { SkeletonBlock } from '@/components/Skeleton';

const today = () => new Date().toISOString().slice(0, 10);

function CreateMeetingModal({
  colleagues,
  defaultName,
  onClose,
  onCreated,
}: {
  colleagues: User[];
  defaultName: string;
  onClose: () => void;
  onCreated: (minute: MeetingMinute) => void;
}) {
  const [title, setTitle] = useState('');
  const [recordedByName, setRecordedByName] = useState(defaultName);
  const [recordDate, setRecordDate] = useState(today());
  const [location, setLocation] = useState('');
  const [attendees, setAttendees] = useState('');
  const [content, setContent] = useState('');
  const [details, setDetails] = useState<PropertyDetail[]>([]);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleRecipient = (id: string) =>
    setRecipientIds((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (recipientIds.length === 0) {
      setError('กรุณาเลือกผู้รับอย่างน้อย 1 คน');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post<{ minute: MeetingMinute }>('/meeting-minutes', {
        title: title || undefined,
        recordedByName,
        recordDate,
        location: location || undefined,
        attendees: attendees || undefined,
        content,
        details: details.filter((d) => d.label.trim() && d.value.trim()),
        recipientIds,
      });
      onCreated(res.minute);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">เพิ่มบันทึกการประชุม</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">หัวข้อการประชุม</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ประชุมทีมประจำสัปดาห์"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ผู้บันทึก</label>
              <input
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={recordedByName}
                onChange={(e) => setRecordedByName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">วันที่บันทึก</label>
              <input
                type="date"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">สถานที่ประชุม</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ผู้เข้าร่วมประชุม</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                placeholder="คั่นด้วยจุลภาค"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">เนื้อหาการประชุม</label>
            <textarea
              rows={6}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">รายละเอียดเพิ่มเติม</label>
            <DetailsEditor details={details} onChange={setDetails} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">ส่งถึง (เลือกอย่างน้อย 1 คน)</label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {colleagues.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={recipientIds.includes(c.id)} onChange={() => toggleRecipient(c.id)} />
                  {c.name}
                  {!c.lineUserId && <span className="text-xs text-amber-600">(ยังไม่เชื่อมต่อ LINE)</span>}
                </label>
              ))}
              {colleagues.length === 0 && <p className="text-sm text-slate-400">ไม่มีผู้ใช้งานอื่น</p>}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'เพิ่มบันทึกการประชุม'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg px-5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MeetingMinutesPage() {
  const { user } = useAuth();
  const [minutes, setMinutes] = useState<MeetingMinute[]>([]);
  const [loading, setLoading] = useState(true);
  const [colleagues, setColleagues] = useState<User[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ minute: MeetingMinute; time: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    api
      .get<MeetingMinute[]>('/meeting-minutes')
      .then(setMinutes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    api.get<User[]>('/users/colleagues').then(setColleagues).catch(() => {});
  }, []);

  const handleCreated = (minute: MeetingMinute) => {
    setShowCreate(false);
    setSuccessInfo({ minute, time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) });
    load();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">บันทึกการประชุม</h1>
          <p className="text-sm text-slate-500">บันทึกและส่งสรุปการประชุมให้เพื่อนร่วมงานผ่าน LINE</p>
        </div>
        <button type="button"
          onClick={() => setShowCreate(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-xl text-white shadow-md hover:bg-blue-700"
          title="เพิ่มบันทึกการประชุม"
        >
          +
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {minutes.map((m, i) => (
          <div
            key={m.id}
            className="hover-card fade-up rounded-2xl border border-blue-100 bg-white shadow-sm"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            <button type="button" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)} className="w-full p-5 text-left">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{m.title || 'บันทึกการประชุม'}</p>
                <span className="text-xs text-slate-400">{m.recordDate}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">บันทึกโดย {m.recordedByName}</p>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{m.content}</p>
            </button>
            {expandedId === m.id && (
              <div className="border-t border-slate-100 p-5 text-sm">
                {m.location && <p className="mb-1 text-slate-600"><span className="text-slate-400">สถานที่:</span> {m.location}</p>}
                {m.attendees && <p className="mb-1 text-slate-600"><span className="text-slate-400">ผู้เข้าร่วม:</span> {m.attendees}</p>}
                <p className="mb-3 whitespace-pre-line text-slate-700">{m.content}</p>
                {m.details.length > 0 && (
                  <dl className="mb-3 divide-y divide-slate-100">
                    {m.details.map((d, idx) => (
                      <div key={idx} className="flex justify-between py-1">
                        <dt className="text-slate-500">{d.label}</dt>
                        <dd className="text-slate-900">{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="text-xs text-slate-400">ส่งถึง {m.recipientIds.length} คน</p>
              </div>
            )}
          </div>
        ))}
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="mt-2 h-3 w-full" />
            </div>
          ))}
        {!loading && minutes.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีบันทึกการประชุม</p>}
      </div>

      {showCreate && (
        <CreateMeetingModal
          colleagues={colleagues}
          defaultName={user?.name || ''}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {successInfo && (
        <MeetingSuccessModal
          recordedByName={successInfo.minute.recordedByName}
          recordDate={successInfo.minute.recordDate}
          time={successInfo.time}
          onView={() => {
            setExpandedId(successInfo.minute.id);
            setSuccessInfo(null);
          }}
          onClose={() => setSuccessInfo(null)}
        />
      )}
    </div>
  );
}
