'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { User, Property, Role, UserStatus } from '@/lib/types';

const ROLE_LABEL: Record<Role, string> = {
  owner: 'เจ้าของ',
  staff: 'พนักงาน',
  accountant: 'ฝ่ายบัญชี',
};

interface ActivityLogEntry {
  id: string;
  userName: string;
  action: string;
  description: string;
  createdAt: string;
}

function ActivityLogSection() {
  const [show, setShow] = useState(false);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    if (show && logs.length === 0) {
      api.get<ActivityLogEntry[]>('/activity-log').then(setLogs).catch(() => {});
    }
  }, [show, logs.length]);

  return (
    <div className="mt-6 rounded-2xl border border-blue-100 bg-white shadow-sm">
      <button
        onClick={() => setShow((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-semibold text-slate-900"
      >
        ประวัติการทำงาน (Activity Log)
        <span className="text-xs font-normal text-blue-600">{show ? 'ซ่อน' : 'แสดง'}</span>
      </button>
      {show && (
        <div className="max-h-96 overflow-y-auto border-t border-slate-100">
          {logs.map((log, i) => (
            <div
              key={log.id}
              className="fade-up border-b border-slate-50 px-5 py-2.5 text-sm last:border-0"
              style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
            >
              <p className="text-slate-700">
                <span className="font-medium text-slate-900">{log.userName}</span> {log.description}
              </p>
              <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString('th-TH')}</p>
            </div>
          ))}
          {logs.length === 0 && <p className="px-5 py-6 text-center text-sm text-slate-400">ยังไม่มีประวัติ</p>}
        </div>
      )}
    </div>
  );
}

function AssignPropertiesModal({
  staffUser,
  properties,
  onClose,
  onSaved,
}: {
  staffUser: User;
  properties: Property[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(staffUser.assignedProperties?.map((p) => p.id) || []);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${staffUser.id}/assign-properties`, { propertyIds: selected });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">มอบหมายทรัพย์สินให้ {staffUser.name}</h3>
        <p className="mb-4 text-xs text-slate-500">เลือกทรัพย์สินที่ผู้ใช้นี้จะเห็นและจัดการได้</p>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {properties.map((p) => (
            <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
              <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
              {p.name} <span className="text-xs text-slate-400">({p.type})</span>
            </label>
          ))}
          {properties.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีทรัพย์สิน</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button onClick={onClose} className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [assigningUser, setAssigningUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'owner') router.replace('/dashboard');
  }, [user, router]);

  const load = () => {
    api.get<User[]>('/users').then(setUsers).catch((err) => setError(err.message));
    api.get<Property[]>('/properties?category=hostel').then((hostels) =>
      api.get<Property[]>('/properties?category=single').then((singles) => setProperties([...hostels, ...singles]))
    );
  };

  useEffect(() => {
    if (user?.role === 'owner') load();
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/auth/register', { username, password, name, phone: phone || undefined, email: email || undefined, role });
      setUsername('');
      setPassword('');
      setName('');
      setPhone('');
      setEmail('');
      setRole('staff');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'สร้างพนักงานไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (staffUser: User) => {
    const nextStatus: UserStatus = staffUser.status === 'active' ? 'inactive' : 'active';
    await api.put(`/users/${staffUser.id}`, { status: nextStatus });
    load();
  };

  const changeRole = async (staffUser: User, nextRole: Role) => {
    await api.put(`/users/${staffUser.id}`, { role: nextRole });
    load();
  };

  if (user && user.role !== 'owner') return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">พนักงาน & สิทธิ์การใช้งาน</h1>
          <p className="text-sm text-slate-500">สร้างบัญชีพนักงาน กำหนดบทบาท และมอบหมายทรัพย์สินที่รับผิดชอบ</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'ยกเลิก' : '+ เพิ่มพนักงาน'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              placeholder="ชื่อผู้ใช้ (username)"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="รหัสผ่าน"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              placeholder="ชื่อ-นามสกุล"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              placeholder="เบอร์โทร"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              placeholder="อีเมล"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="staff">พนักงาน</option>
              <option value="accountant">ฝ่ายบัญชี</option>
              <option value="owner">เจ้าของ</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'สร้างบัญชี'}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-blue-100 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">ชื่อ</th>
              <th className="px-4 py-2 font-medium">บทบาท</th>
              <th className="px-4 py-2 font-medium">ทรัพย์สินที่ดูแล</th>
              <th className="px-4 py-2 font-medium">LINE</th>
              <th className="px-4 py-2 font-medium">สถานะ</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr
                key={u.id}
                className="fade-up border-b border-slate-100 transition-colors last:border-0 hover:bg-blue-50/50"
                style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
              >
                <td className="px-4 py-2 text-slate-900">
                  {u.name}
                  <span className="ml-1 text-xs text-slate-400">@{u.username}</span>
                </td>
                <td className="px-4 py-2">
                  {u.id === user?.id ? (
                    ROLE_LABEL[u.role]
                  ) : (
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as Role)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                    >
                      <option value="staff">พนักงาน</option>
                      <option value="accountant">ฝ่ายบัญชี</option>
                      <option value="owner">เจ้าของ</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-600">
                  {u.role === 'owner' ? (
                    <span className="text-xs text-slate-400">ทั้งหมด</span>
                  ) : (
                    <button onClick={() => setAssigningUser(u)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                      {u.assignedProperties?.length ? `${u.assignedProperties.length} รายการ` : 'ยังไม่ได้มอบหมาย'}
                    </button>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.lineUserId ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.lineUserId ? 'เชื่อมต่อแล้ว' : 'ยังไม่เชื่อมต่อ'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {u.status === 'active' ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  {u.id !== user?.id && (
                    <button onClick={() => toggleStatus(u)} className="text-xs font-medium text-slate-500 hover:text-slate-700">
                      {u.status === 'active' ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">ยังไม่มีพนักงาน</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {assigningUser && (
        <AssignPropertiesModal
          staffUser={assigningUser}
          properties={properties}
          onClose={() => setAssigningUser(null)}
          onSaved={load}
        />
      )}

      <ActivityLogSection />
    </div>
  );
}
