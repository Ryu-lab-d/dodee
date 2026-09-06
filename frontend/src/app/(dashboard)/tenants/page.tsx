'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { Tenant, Room } from '@/lib/types';
import { SkeletonRows } from '@/components/Skeleton';

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [vacantRooms, setVacantRooms] = useState<Room[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .get<Tenant[]>('/tenants')
      .then(setTenants)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    api
      .get<Room[]>('/rooms')
      .then((rooms) => setVacantRooms(rooms.filter((r) => r.status === 'ว่าง')))
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/tenants', {
        roomId,
        name,
        phone,
        moveInDate: moveInDate || undefined,
        contractEndDate: contractEndDate || undefined,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
      });
      setName('');
      setPhone('');
      setMoveInDate('');
      setContractEndDate('');
      setDepositAmount('');
      setRoomId('');
      setShowForm(false);
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
        <h1 className="text-xl font-semibold text-slate-900">ผู้เช่า</h1>
        {(user?.role === 'owner' || user?.role === 'staff') && (
          <button type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm ? 'ยกเลิก' : '+ เพิ่มผู้เช่า'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ห้อง (ว่าง)</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
              >
                <option value="" disabled>เลือกห้อง</option>
                {vacantRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.property?.name}{r.roomNumber !== 'หลัก' ? ` - ห้อง ${r.roomNumber}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อผู้เช่า</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">เบอร์โทร</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">วันที่เข้าอยู่</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">วันหมดสัญญา</label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={contractEndDate}
                onChange={(e) => setContractEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">เงินมัดจำ (บาท)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-blue-100 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">ชื่อ</th>
              <th className="px-4 py-2 font-medium">ห้อง</th>
              <th className="px-4 py-2 font-medium">เบอร์โทร</th>
              <th className="px-4 py-2 font-medium">หมดสัญญา</th>
              <th className="px-4 py-2 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t, i) => (
              <tr
                key={t.id}
                className="fade-up border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/50"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <td className="px-4 py-2 text-slate-900">{t.name}</td>
                <td className="px-4 py-2 text-slate-600">{t.room?.roomNumber || '-'}</td>
                <td className="px-4 py-2 text-slate-600">{t.phone || '-'}</td>
                <td className="px-4 py-2 text-slate-600">{t.contractEndDate || '-'}</td>
                <td className="px-4 py-2 text-slate-600">{t.status}</td>
              </tr>
            ))}
            {loading && <SkeletonRows count={5} cols={5} />}
            {!loading && tenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">ยังไม่มีผู้เช่า</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
