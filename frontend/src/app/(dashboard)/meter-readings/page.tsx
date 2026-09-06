'use client';

import { Fragment, useEffect, useState, FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { PendingRoomReading } from '@/lib/types';

const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function MeterReadingsPage() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState<PendingRoomReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [waterCurrent, setWaterCurrent] = useState('');
  const [electricityCurrent, setElectricityCurrent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api
      .get<PendingRoomReading[]>(`/meter-readings/pending?month=${month}`)
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const openForm = (roomId: string) => {
    setActiveRoomId(roomId);
    setWaterCurrent('');
    setElectricityCurrent('');
    setError(null);
    setWarning(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeRoomId) return;
    setError(null);
    setWarning(null);
    setSaving(true);
    try {
      const res = await api.post<{ warning: string | null }>('/meter-readings', {
        roomId: activeRoomId,
        readingDate: new Date().toISOString().slice(0, 10),
        waterCurrent: Number(waterCurrent),
        electricityCurrent: Number(electricityCurrent),
      });
      if (res.warning) setWarning(res.warning);
      setActiveRoomId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">จดมิเตอร์</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {warning && <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{warning}</div>}

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-blue-100 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">ทรัพย์สิน / ห้อง</th>
              <th className="px-4 py-2 font-medium">น้ำครั้งก่อน</th>
              <th className="px-4 py-2 font-medium">ไฟครั้งก่อน</th>
              <th className="px-4 py-2 font-medium">สถานะเดือนนี้</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ room, latestReading, hasReadingThisMonth }, i) => (
              <Fragment key={room.id}>
                <tr
                  className="fade-up border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/50"
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <td className="px-4 py-2 text-slate-900">
                    {room.property?.name}{room.roomNumber !== 'หลัก' ? ` - ห้อง ${room.roomNumber}` : ''}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {Number(latestReading ? latestReading.waterCurrent : room.meterWaterInitial).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {Number(latestReading ? latestReading.electricityCurrent : room.meterElectricityInitial).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${hasReadingThisMonth ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {hasReadingThisMonth ? 'จดแล้ว' : 'ยังไม่จด'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button type="button"
                      onClick={() => openForm(room.id)}
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      จดมิเตอร์
                    </button>
                  </td>
                </tr>
                {activeRoomId === room.id && (
                  <tr className="border-b border-slate-100 bg-sky-50">
                    <td colSpan={5} className="px-4 py-4">
                      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-700">เลขมิเตอร์น้ำ (ปัจจุบัน)</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            className="w-36 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={waterCurrent}
                            onChange={(e) => setWaterCurrent(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-700">เลขมิเตอร์ไฟ (ปัจจุบัน)</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            className="w-36 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            value={electricityCurrent}
                            onChange={(e) => setElectricityCurrent(e.target.value)}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveRoomId(null)}
                          className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
                        >
                          ยกเลิก
                        </button>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">กำลังโหลด...</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  ยังไม่มีห้องให้จดมิเตอร์
                  <br />
                  <span className="text-xs">ไปที่เมนู &quot;หอพัก&quot; หรือ &quot;บ้าน &amp; คอนโด&quot; แล้วเพิ่มทรัพย์สิน/ห้องก่อน ถึงจะมีห้องมาแสดงในหน้านี้</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
