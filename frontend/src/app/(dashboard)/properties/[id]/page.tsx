'use client';

import { use, useEffect, useState, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api, ApiError, fileUrl } from '@/lib/api';
import { Property, PropertyDetail, Room, RoomStatus } from '@/lib/types';
import ImageUploader from '@/components/ImageUploader';
import DetailsEditor from '@/components/DetailsEditor';
import TenantAssignPanel from '@/components/TenantAssignPanel';
import LocationFields, { emptyLocation, LocationValue } from '@/components/LocationFields';

const STATUS_STYLE: Record<RoomStatus, string> = {
  ว่าง: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  ไม่ว่าง: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  ซ่อม: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

const CARD_RING: Record<RoomStatus, string> = {
  ว่าง: 'border-green-200',
  ไม่ว่าง: 'border-slate-200',
  ซ่อม: 'border-amber-200',
};

function RoomDetailPanel({ room, canEdit, onSaved, onDeleted }: { room: Room; canEdit: boolean; onSaved: () => void; onDeleted: () => void }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [baseRentPrice, setBaseRentPrice] = useState(room.baseRentPrice);
  const [description, setDescription] = useState(room.description || '');
  const [images, setImages] = useState<string[]>(room.images || []);
  const [details, setDetails] = useState<PropertyDetail[]>(room.details || []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.put(`/rooms/${room.id}`, {
        baseRentPrice: Number(baseRentPrice),
        description: description || undefined,
        images,
        details: details.filter((d) => d.label.trim() && d.value.trim()),
      });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`ลบห้อง ${room.roomNumber} ใช่ไหม? ผู้เช่า ประวัติมิเตอร์ และใบแจ้งหนี้ของห้องนี้จะถูกลบถาวรไปด้วย ย้อนกลับไม่ได้`)) return;
    try {
      await api.delete(`/rooms/${room.id}`);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ลบไม่สำเร็จ');
    }
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-sky-50 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">ห้อง {room.roomNumber}</h3>
        <div className="flex gap-2">
          {canEdit && !editing && (
            <button type="button"
              onClick={() => {
                setError(null);
                setEditing(true);
              }}
              className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              แก้ไขรายละเอียดห้อง
            </button>
          )}
          {user?.role === 'owner' && !editing && (
            <button type="button"
              onClick={handleDelete}
              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              ลบห้อง
            </button>
          )}
        </div>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {canEdit && (
        <div className="mb-4">
          <TenantAssignPanel room={room} onSaved={onSaved} />
        </div>
      )}

      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">ค่าเช่า/เดือน (บาท)</label>
            <input
              type="number"
              className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={baseRentPrice}
              onChange={(e) => setBaseRentPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">คำอธิบาย</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">รูปภาพ</label>
            <ImageUploader images={images} onChange={setImages} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">รายละเอียดเพิ่มเติม</label>
            <DetailsEditor details={details} onChange={setDetails} />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      ) : (
        <div>
          {room.images.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {room.images.map((img) => (
                <div key={img} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                  <Image src={fileUrl(img)} alt={room.roomNumber} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}
          {room.description && <p className="mb-2 whitespace-pre-line text-sm text-slate-600">{room.description}</p>}
          {room.details.length > 0 && (
            <dl className="max-w-md divide-y divide-slate-200 text-sm">
              {room.details.map((d, idx) => (
                <div key={idx} className="flex justify-between py-1">
                  <dt className="text-slate-500">{d.label}</dt>
                  <dd className="text-slate-900">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {!room.images.length && !room.description && !room.details.length && (
            <p className="text-sm text-slate-400">ยังไม่มีรายละเอียดเพิ่มเติมสำหรับห้องนี้</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [baseRentPrice, setBaseRentPrice] = useState('');
  const [roomImages, setRoomImages] = useState<string[]>([]);
  const [expandedRoomId, setExpandedRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingProperty, setEditingProperty] = useState(false);
  const [propName, setPropName] = useState('');
  const [propLocation, setPropLocation] = useState<LocationValue>(emptyLocation);
  const [propDescription, setPropDescription] = useState('');
  const [propImages, setPropImages] = useState<string[]>([]);
  const [propDetails, setPropDetails] = useState<PropertyDetail[]>([]);
  const [savingProperty, setSavingProperty] = useState(false);
  const [propertyError, setPropertyError] = useState<string | null>(null);

  const load = () =>
    api
      .get<Property>(`/properties/${id}`)
      .then((p) => {
        setProperty(p);
        setPropName(p.name);
        setPropLocation({
          address: p.address || '',
          subdistrict: p.subdistrict || '',
          district: p.district || '',
          province: p.province || '',
          postalCode: p.postalCode || '',
          latitude: p.latitude != null ? Number(p.latitude) : null,
          longitude: p.longitude != null ? Number(p.longitude) : null,
        });
        setPropDescription(p.description || '');
        setPropImages(p.images || []);
        setPropDetails(p.details || []);
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSaveProperty = async (e: FormEvent) => {
    e.preventDefault();
    setPropertyError(null);
    setSavingProperty(true);
    try {
      await api.put(`/properties/${id}`, {
        name: propName,
        ...propLocation,
        description: propDescription || undefined,
        images: propImages,
        details: propDetails.filter((d) => d.label.trim() && d.value.trim()),
      });
      setEditingProperty(false);
      load();
    } catch (err) {
      setPropertyError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSavingProperty(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!property) return;
    if (
      !confirm(
        `ลบ "${property.name}" ใช่ไหม? การลบจะลบห้องทั้งหมด ผู้เช่า ประวัติมิเตอร์ และใบแจ้งหนี้ของทรัพย์สินนี้ทั้งหมดอย่างถาวร ย้อนกลับไม่ได้`
      )
    ) {
      return;
    }
    setPropertyError(null);
    try {
      await api.delete(`/properties/${id}`);
      router.push('/properties');
    } catch (err) {
      setPropertyError(err instanceof ApiError ? err.message : 'ลบไม่สำเร็จ');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post('/rooms', { propertyId: id, roomNumber, baseRentPrice: Number(baseRentPrice), images: roomImages });
      setRoomNumber('');
      setBaseRentPrice('');
      setRoomImages([]);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (error && !property) return <p className="text-sm text-red-600">{error}</p>;
  if (!property) return <p className="text-sm text-slate-400">กำลังโหลด...</p>;

  const rooms: Room[] = property.rooms || [];
  const canEdit = user?.role === 'owner' || user?.role === 'staff';
  const expandedRoom = rooms.find((r) => r.id === expandedRoomId);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{property.name}</h1>
          <p className="text-sm text-slate-500">
            {[property.address, property.subdistrict, property.district, property.province, property.postalCode]
              .filter(Boolean)
              .join(' · ') || 'ไม่ระบุที่อยู่'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {canEdit && (
            <button type="button"
              onClick={() => setEditingProperty((v) => !v)}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              {editingProperty ? 'ยกเลิก' : 'แก้ไขทรัพย์สิน'}
            </button>
          )}
          {user?.role === 'owner' && (
            <button type="button"
              onClick={handleDeleteProperty}
              className="rounded-lg border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              ลบทรัพย์สิน
            </button>
          )}
        </div>
      </div>

      {editingProperty ? (
        <form onSubmit={handleSaveProperty} className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          {propertyError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{propertyError}</div>}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">ชื่อหอพัก</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={propName}
              onChange={(e) => setPropName(e.target.value)}
              required
            />
          </div>
          <div className="mt-3">
            <LocationFields value={propLocation} onChange={(patch) => setPropLocation((v) => ({ ...v, ...patch }))} />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">คำอธิบาย</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={propDescription}
              onChange={(e) => setPropDescription(e.target.value)}
            />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">รูปภาพ</label>
            <ImageUploader images={propImages} onChange={setPropImages} />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">รายละเอียดเพิ่มเติม</label>
            <DetailsEditor details={propDetails} onChange={setPropDetails} />
          </div>
          <button
            type="submit"
            disabled={savingProperty}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {savingProperty ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>
      ) : (
        <>
          {property.images.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {property.images.map((img) => (
                <div key={img} className="relative h-28 overflow-hidden rounded-xl border border-slate-200">
                  <Image src={fileUrl(img)} alt={property.name} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          )}

          {(property.description || property.details.length > 0) && (
            <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              {property.description && <p className="mb-3 whitespace-pre-line text-sm text-slate-600">{property.description}</p>}
              {property.details.length > 0 && (
                <dl className="divide-y divide-slate-100 text-sm">
                  {property.details.map((d, idx) => (
                    <div key={idx} className="flex justify-between py-1.5">
                      <dt className="text-slate-500">{d.label}</dt>
                      <dd className="text-slate-900">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">ห้องทั้งหมด ({rooms.length})</h2>
        {canEdit && (
          <button type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showForm ? 'ยกเลิก' : '+ เพิ่มห้อง'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">เลขห้อง</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">ค่าเช่า/เดือน (บาท)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={baseRentPrice}
                onChange={(e) => setBaseRentPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">รูปภาพ</label>
            <ImageUploader images={roomImages} onChange={setRoomImages} />
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rooms.map((room, i) => {
          const tenant = room.tenants?.find((t) => t.status === 'เช่าอยู่');
          return (
            <button type="button"
              key={room.id}
              onClick={() => setExpandedRoomId(expandedRoomId === room.id ? null : room.id)}
              className={`fade-up overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition ${
                expandedRoomId === room.id ? 'border-blue-500' : CARD_RING[room.status]
              }`}
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <div className="relative h-20 w-full bg-slate-100">
                {room.images?.[0] ? (
                  <Image src={fileUrl(room.images[0])} alt={room.roomNumber} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl">🚪</div>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-slate-900">ห้อง {room.roomNumber}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[room.status]}`}>
                  {room.status}
                </span>
                <p className="mt-1 truncate text-xs text-slate-500">{tenant ? tenant.name : `฿${Number(room.baseRentPrice).toLocaleString()}`}</p>
              </div>
            </button>
          );
        })}
        {rooms.length === 0 && <p className="col-span-full text-sm text-slate-400">ยังไม่มีห้อง</p>}
      </div>

      {expandedRoom && (
        <div className="mt-4">
          <RoomDetailPanel
            room={expandedRoom}
            canEdit={canEdit}
            onSaved={load}
            onDeleted={() => {
              setExpandedRoomId(null);
              load();
            }}
          />
        </div>
      )}
    </div>
  );
}
