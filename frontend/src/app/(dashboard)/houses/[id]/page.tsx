'use client';

import { use, useEffect, useState, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError, fileUrl } from '@/lib/api';
import { Property, PropertyDetail, RoomStatus } from '@/lib/types';
import ImageUploader from '@/components/ImageUploader';
import DetailsEditor from '@/components/DetailsEditor';
import TenantAssignPanel from '@/components/TenantAssignPanel';
import LocationFields, { emptyLocation, LocationValue } from '@/components/LocationFields';

const STATUS_STYLE: Record<RoomStatus, string> = {
  ว่าง: 'bg-green-50 text-green-700',
  ไม่ว่าง: 'bg-slate-100 text-slate-700',
  ซ่อม: 'bg-amber-50 text-amber-700',
};

export default function HouseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [house, setHouse] = useState<Property | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [location, setLocation] = useState<LocationValue>(emptyLocation);
  const [baseRentPrice, setBaseRentPrice] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [details, setDetails] = useState<PropertyDetail[]>([]);

  const load = () =>
    api
      .get<Property>(`/properties/${id}`)
      .then((p) => {
        setHouse(p);
        setLocation({
          address: p.address || '',
          subdistrict: p.subdistrict || '',
          district: p.district || '',
          province: p.province || '',
          postalCode: p.postalCode || '',
          latitude: p.latitude != null ? Number(p.latitude) : null,
          longitude: p.longitude != null ? Number(p.longitude) : null,
        });
        setBaseRentPrice(p.rooms?.[0]?.baseRentPrice || '0');
        setDescription(p.description || '');
        setImages(p.images || []);
        setDetails(p.details || []);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.put(`/properties/${id}`, {
        ...location,
        baseRentPrice: Number(baseRentPrice || 0),
        description: description || undefined,
        images,
        details: details.filter((d) => d.label.trim() && d.value.trim()),
      });
      setEditing(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: RoomStatus) => {
    if (!house?.rooms?.[0]) return;
    await api.put(`/rooms/${house.rooms[0].id}`, { status });
    load();
  };

  const handleDelete = async () => {
    if (!house) return;
    if (
      !confirm(
        `ลบ "${house.name}" ใช่ไหม? การลบจะลบผู้เช่า ประวัติมิเตอร์ และใบแจ้งหนี้ของทรัพย์สินนี้ทั้งหมดอย่างถาวร ย้อนกลับไม่ได้`
      )
    ) {
      return;
    }
    setError(null);
    try {
      await api.delete(`/properties/${id}`);
      router.push('/houses');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ลบไม่สำเร็จ');
    }
  };

  if (error && !house) return <p className="text-sm text-red-600">{error}</p>;
  if (!house) return <p className="text-sm text-slate-400">กำลังโหลด...</p>;

  const unit = house.rooms?.[0];
  const canEdit = user?.role === 'owner' || user?.role === 'staff';
  const fullAddress = [house.address, house.subdistrict, house.district, house.province, house.postalCode]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{house.name}</h1>
          <p className="text-sm text-slate-500">{house.type} · {fullAddress || 'ไม่ระบุที่อยู่'}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canEdit && (
            <button
              onClick={() => {
                setError(null);
                setEditing((v) => !v);
              }}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {editing ? 'ยกเลิก' : 'แก้ไข'}
            </button>
          )}
          {user?.role === 'owner' && (
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              ลบทรัพย์สิน
            </button>
          )}
        </div>
      </div>

      {error && !editing && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {editing ? (
        <form onSubmit={handleSave} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">ค่าเช่า/เดือน (บาท)</label>
            <input
              type="number"
              className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={baseRentPrice}
              onChange={(e) => setBaseRentPrice(e.target.value)}
            />
          </div>
          <LocationFields value={location} onChange={(patch) => setLocation((v) => ({ ...v, ...patch }))} />
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">คำอธิบาย</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">รูปภาพ</label>
            <ImageUploader images={images} onChange={setImages} />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">รายละเอียดเพิ่มเติม</label>
            <DetailsEditor details={details} onChange={setDetails} />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          {house.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {house.images.map((img) => (
                <div key={img} className="relative h-36 overflow-hidden rounded-xl border border-slate-200">
                  <Image src={fileUrl(img)} alt={house.name} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">สถานะ</h2>
              {unit && canEdit ? (
                <select
                  value={unit.status}
                  onChange={(e) => handleStatusChange(e.target.value as RoomStatus)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500"
                >
                  <option value="ว่าง">ว่าง</option>
                  <option value="ไม่ว่าง">ไม่ว่าง</option>
                  <option value="ซ่อม">ซ่อม</option>
                </select>
              ) : (
                unit && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[unit.status]}`}>
                    {unit.status}
                  </span>
                )
              )}
            </div>
            {unit && <p className="mt-2 text-sm text-slate-600">ค่าเช่า ฿{Number(unit.baseRentPrice).toLocaleString()}/เดือน</p>}

            {unit && (
              <div className="mt-4">
                {canEdit ? (
                  <TenantAssignPanel room={unit} onSaved={load} />
                ) : (
                  unit.tenants?.find((t) => t.status === 'เช่าอยู่') && (
                    <p className="text-sm text-slate-600">ผู้เช่าปัจจุบัน: {unit.tenants.find((t) => t.status === 'เช่าอยู่')!.name}</p>
                  )
                )}
              </div>
            )}
          </div>

          {house.description && (
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">คำอธิบาย</h2>
              <p className="whitespace-pre-line text-sm text-slate-600">{house.description}</p>
            </div>
          )}

          {house.details.length > 0 && (
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">รายละเอียดเพิ่มเติม</h2>
              <dl className="divide-y divide-slate-100 text-sm">
                {house.details.map((d, idx) => (
                  <div key={idx} className="flex justify-between py-1.5">
                    <dt className="text-slate-500">{d.label}</dt>
                    <dd className="text-slate-900">{d.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
