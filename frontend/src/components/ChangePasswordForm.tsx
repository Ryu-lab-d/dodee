'use client';

import { useState, FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('เปลี่ยนรหัสผ่านสำเร็จ');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">เปลี่ยนรหัสผ่าน</h2>
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          placeholder="รหัสผ่านปัจจุบัน"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input
          type="password"
          placeholder="ยืนยันรหัสผ่านใหม่"
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่าน'}
        </button>
      </form>
    </div>
  );
}
