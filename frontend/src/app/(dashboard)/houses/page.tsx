'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { api, ApiError, fileUrl } from '@/lib/api';
import { Property, PropertyDetail, RoomStatus } from '@/lib/types';
import ImageUploader from '@/components/ImageUploader';
import DetailsEditor from '@/components/DetailsEditor';
import LocationFields, { emptyLocation, LocationValue } from '@/components/LocationFields';
import { SkeletonCards } from '@/components/Skeleton';

const STATUS_STYLE: Record<RoomStatus, string> = {
  ว่าง: 'bg-green-50 text-green-700',
  ไม่ว่าง: 'bg-slate-100 text-slate-700',
  ซ่อม: 'bg-amber-50 text-amber-700',
};

export default function HousesPage() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'บ้าน' | 'คอนโด'>('บ้าน');
  const [location, setLocation] = useState<LocationValue>(emptyLocation);
  const [baseRentPrice, setBaseRentPrice] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [details, setDetails] = useState<PropertyDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const load = () =>
    api
      .get<Property[]>('/properties?category=single')
      .then(setHouses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName('');
    setType('บ้าน');
    setLocation(emptyLocation);
    setBaseRentPrice('');
    setDescription('');
    setImages([]);
    setDetails([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/properties', {
        name,
        type,
        ...location,
        baseRentPrice: Number(baseRentPrice || 0),
        description: description || undefined,
        images,
        details: details.filter((d) => d.label.trim() && d.value.trim()),
      });
      resetForm();
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
        <div>
          <h1 className="text-xl font-semibold text-slate-900">บ้าน & คอนโด</h1>
          <p className="text-sm text-slate-500">ทรัพย์สินให้เช่าแบบหลังเดียว/ยูนิตเดียว ไม่แบ่งย่อยเป็นห้อง</p>
        </div>
        {user?.role === 'owner' && (
          <button type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm ? 'ยกเลิก' : '+ เพิ่มบ้าน/คอนโด'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อทรัพย์สิน</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ประเภท</label>
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                <option value="บ้าน">บ้าน</option>
                <option value="คอนโด">คอนโด</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ค่าเช่า/เดือน (บาท) - แก้ไขทีหลังได้</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={baseRentPrice}
                onChange={(e) => setBaseRentPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <LocationFields value={location} onChange={(patch) => setLocation((v) => ({ ...v, ...patch }))} />
          </div>

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
            <ImageUploader images={images} onChange={setImages} onUploadingChange={setPhotoUploading} />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">รายละเอียดเพิ่มเติม</label>
            <DetailsEditor details={details} onChange={setDetails} />
          </div>

          <button
            type="submit"
            disabled={saving || photoUploading}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : photoUploading ? 'รอรูปภาพอัปโหลดเสร็จ...' : 'บันทึก'}
          </button>
        </form>
      )}

      {loading ? (
        <SkeletonCards />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {houses.map((h, i) => {
            const unit = h.rooms?.[0];
            return (
              <Link
                key={h.id}
                href={`/houses/${h.id}`}
                className="hover-card fade-up overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm hover:border-blue-400"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                <div className="relative h-32 w-full bg-slate-100">
                  {h.images?.[0] ? (
                    <Image src={fileUrl(h.images[0])} alt={h.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">ไม่มีรูปภาพ</div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{h.name}</p>
                    {unit && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[unit.status]}`}>
                        {unit.status}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{h.type} · {h.address || 'ไม่ระบุที่อยู่'}</p>
                  {unit && <p className="mt-3 text-sm text-slate-600">ค่าเช่า ฿{Number(unit.baseRentPrice).toLocaleString()}/เดือน</p>}
                </div>
              </Link>
            );
          })}
          {houses.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีบ้าน/คอนโด</p>}
        </div>
      )}
    </div>
  );
}
