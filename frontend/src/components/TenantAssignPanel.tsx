'use client';

import { useState, FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import { Room } from '@/lib/types';

export default function TenantAssignPanel({ room, onSaved }: { room: Room; onSaved: () => void }) {
  const activeTenant = room.tenants?.find((t) => t.status === 'เช่าอยู่');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/tenants', {
        roomId: room.id,
        name,
        phone,
        moveInDate: moveInDate || undefined,
        contractEndDate: contractEndDate || undefined,
        depositAmount: depositAmount ? Number(depositAmount) : undefined,
      });
      setShowForm(false);
      setName('');
      setPhone('');
      setMoveInDate('');
      setContractEndDate('');
      setDepositAmount('');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleEndTenancy = async () => {
    if (!activeTenant) return;
    if (!confirm(`สิ้นสุดสัญญาของ "${activeTenant.name}" และปล่อยห้องนี้ว่างใช่ไหม?`)) return;
    await api.put(`/tenants/${activeTenant.id}`, { status: 'หมดสัญญา' });
    onSaved();
  };

  if (activeTenant) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium text-slate-500">ผู้เช่าปัจจุบัน</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{activeTenant.name}</p>
        <p className="text-sm text-slate-600">{activeTenant.phone || 'ไม่มีเบอร์โทร'}</p>
        {activeTenant.contractEndDate && (
          <p className="text-sm text-slate-600">หมดสัญญา: {activeTenant.contractEndDate}</p>
        )}
        <button
          onClick={handleEndTenancy}
          className="mt-3 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          สิ้นสุดสัญญา / ย้ายออก
        </button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
      >
        + เพิ่มผู้เช่าให้ห้องนี้
      </button>
    );
  }

  return (
    <form onSubmit={handleAssign} className="rounded-xl border border-slate-200 bg-white p-4">
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          placeholder="ชื่อผู้เช่า"
          required
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="เบอร์โทร"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <div>
          <label className="mb-1 block text-xs text-slate-500">วันที่เข้าอยู่</label>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={moveInDate}
            onChange={(e) => setMoveInDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">วันหมดสัญญา</label>
          <input
            type="date"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={contractEndDate}
            onChange={(e) => setContractEndDate(e.target.value)}
          />
        </div>
        <input
          type="number"
          placeholder="เงินมัดจำ (บาท)"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'ยืนยันเพิ่มผู้เช่า'}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="rounded-lg px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
