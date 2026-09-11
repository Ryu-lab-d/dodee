'use client';

import { Fragment, useEffect, useState } from 'react';
import { Check, Minus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface PermissionDef {
  key: string;
  label: string;
}

interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionDef[];
}

type Matrix = Record<'admin' | 'manager', Record<string, boolean>>;

interface PermissionsResponse {
  groups: PermissionGroup[];
  matrix: Matrix;
  roleLabels: Record<string, string>;
}

const ROLE_OVERVIEW: Array<{ role: string; title: string; points: string[] }> = [
  {
    role: 'owner',
    title: 'เจ้าของ',
    points: [
      'เข้าถึงและแก้ไขได้ทุกอย่างในระบบเสมอ ไม่จำกัดด้วยตารางสิทธิ์นี้',
      'เป็นคนเดียวที่ลบทรัพย์สิน/ห้อง/ผู้เช่า จัดการบัญชีพนักงาน และแก้ไขตารางสิทธิ์นี้ได้',
      'ดูประวัติการทำงาน (Activity Log) ของทุกคนในระบบได้',
    ],
  },
  {
    role: 'admin',
    title: 'แอดมิน',
    points: [
      'บทบาทฝ่ายสำนักงาน: ดูแลผู้เช่าและเรื่องการเงินเป็นหลัก',
      'ค่าเริ่มต้น: จัดการผู้เช่า, สร้างบิล, บันทึกการชำระเงิน, บันทึกรายรับ-รายจ่าย',
      'ปรับได้ด้านล่างว่าจะให้เข้าถึงทรัพย์สิน/ห้อง/มิเตอร์เพิ่มหรือไม่',
    ],
  },
  {
    role: 'manager',
    title: 'ผู้จัดการ',
    points: [
      'บทบาทหน้างาน: ดูแลทรัพย์สินที่ได้รับมอบหมายเป็นหลัก',
      'ค่าเริ่มต้น: จัดการทรัพย์สิน/ห้อง/ผู้เช่า, จดมิเตอร์น้ำ-ไฟ',
      'ไม่มีสิทธิ์ด้านการเงินโดยค่าเริ่มต้น ปรับได้ด้านล่างหากต้องการให้ทำบิล/รับชำระเงินได้',
    ],
  },
];

function Switch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      // A borderless light-grey "off" track used to disappear against the white table cells,
      // making it hard to tell at a glance which switches were on vs off. A visible border on
      // the off state plus a check/dash glyph inside the knob (not color alone) fixes that.
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:cursor-wait ${
        checked ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-slate-100'
      }`}
    >
      <span
        className={`absolute top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[21px]' : 'translate-x-0.5'
        } ${disabled ? 'animate-pulse' : ''}`}
      >
        {checked ? <Check size={12} className="text-blue-600" strokeWidth={3} /> : <Minus size={10} className="text-slate-400" strokeWidth={3} />}
      </span>
    </button>
  );
}

export default function PermissionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<PermissionsResponse | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'owner') router.replace('/dashboard');
  }, [user, router]);

  useEffect(() => {
    if (user?.role === 'owner') {
      api.get<PermissionsResponse>('/role-permissions').then(setData).catch((err) => setError(err.message));
    }
  }, [user]);

  const toggle = async (role: 'admin' | 'manager', permKey: string) => {
    if (!data) return;
    const cellKey = `${role}:${permKey}`;
    const nextValue = !data.matrix[role][permKey];

    setData({ ...data, matrix: { ...data.matrix, [role]: { ...data.matrix[role], [permKey]: nextValue } } });
    setSavingKey(cellKey);
    setError(null);
    try {
      await api.put(`/role-permissions/${role}`, { permissions: { [permKey]: nextValue } });
    } catch (err) {
      // revert on failure
      setData((d) => (d ? { ...d, matrix: { ...d.matrix, [role]: { ...d.matrix[role], [permKey]: !nextValue } } } : d));
      setError(err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSavingKey(null);
    }
  };

  if (user && user.role !== 'owner') return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">สิทธิ์การใช้งาน</h1>
        <p className="text-sm text-slate-500">
          กำหนดว่าแต่ละบทบาททำอะไรได้บ้าง — การลบข้อมูลและการจัดการบัญชีพนักงานสงวนไว้ให้เจ้าของเท่านั้นเสมอ เพื่อความปลอดภัย
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {ROLE_OVERVIEW.map((r, i) => (
          <div
            key={r.role}
            className="fade-up rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <h2 className="mb-2 text-sm font-semibold text-slate-900">{r.title}</h2>
            <ul className="space-y-1.5">
              {r.points.map((p, j) => (
                <li key={j} className="flex gap-1.5 text-xs text-slate-500">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-blue-100 bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">สิทธิ์การใช้งาน</th>
              <th className="border-l border-slate-100 px-4 py-2 text-center font-medium">แอดมิน</th>
              <th className="border-l border-slate-100 px-4 py-2 text-center font-medium">ผู้จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {data?.groups.map((group) => (
              <Fragment key={group.key}>
                <tr className="bg-slate-50/60">
                  <td colSpan={3} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {group.label}
                  </td>
                </tr>
                {group.permissions.map((perm, i) => (
                  <tr
                    key={perm.key}
                    className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/40 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}
                  >
                    <td className="px-4 py-2.5 text-slate-700">{perm.label}</td>
                    <td className="border-l border-slate-100 px-4 py-2.5">
                      <div className="flex justify-center">
                        <Switch
                          checked={!!data.matrix.admin[perm.key]}
                          disabled={savingKey === `admin:${perm.key}`}
                          onChange={() => toggle('admin', perm.key)}
                        />
                      </div>
                    </td>
                    <td className="border-l border-slate-100 px-4 py-2.5">
                      <div className="flex justify-center">
                        <Switch
                          checked={!!data.matrix.manager[perm.key]}
                          disabled={savingKey === `manager:${perm.key}`}
                          onChange={() => toggle('manager', perm.key)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
            {!data && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-400">กำลังโหลด...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
