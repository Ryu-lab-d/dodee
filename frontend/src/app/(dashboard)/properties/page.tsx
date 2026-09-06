'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { api, ApiError, fileUrl } from '@/lib/api';
import { Property, PropertyDetail } from '@/lib/types';
import ImageUploader from '@/components/ImageUploader';
import DetailsEditor from '@/components/DetailsEditor';
import LocationFields, { emptyLocation, LocationValue } from '@/components/LocationFields';

export default function PropertiesPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState<LocationValue>(emptyLocation);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [details, setDetails] = useState<PropertyDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get<Property[]>('/properties?category=hostel').then(setProperties).catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setName('');
    setLocation(emptyLocation);
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
        type: 'หอพัก',
        ...location,
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
          <h1 className="text-xl font-semibold text-slate-900">หอพัก</h1>
          <p className="text-sm text-slate-500">ทรัพย์สินแบบหลายห้อง มีการจัดการห้อง/ผู้เช่าแยกรายห้อง</p>
        </div>
        {user?.role === 'owner' && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm ? 'ยกเลิก' : '+ เพิ่มหอพัก'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อหอพัก</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
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
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p, i) => (
          <Link
            key={p.id}
            href={`/properties/${p.id}`}
            className="hover-card fade-up overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm hover:border-blue-400"
            style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
          >
            <div className="relative h-32 w-full bg-slate-100">
              {p.images?.[0] ? (
                <Image src={fileUrl(p.images[0])} alt={p.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">ไม่มีรูปภาพ</div>
              )}
            </div>
            <div className="p-5">
              <p className="font-semibold text-slate-900">{p.name}</p>
              <p className="text-sm text-slate-500">{p.address || 'ไม่ระบุที่อยู่'}</p>
              <p className="mt-3 text-sm text-slate-600">จำนวนห้อง: {p.totalRooms}</p>
            </div>
          </Link>
        ))}
        {properties.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีหอพัก</p>}
      </div>
    </div>
  );
}
