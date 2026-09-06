'use client';

import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

export interface LocationValue {
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
}

export const emptyLocation: LocationValue = {
  address: '',
  subdistrict: '',
  district: '',
  province: '',
  postalCode: '',
  latitude: null,
  longitude: null,
};

export default function LocationFields({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (patch: Partial<LocationValue>) => void;
}) {
  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">ที่อยู่ (บ้านเลขที่ ถนน ซอย)</label>
        <textarea
          rows={2}
          placeholder="ไม่มี"
          className={inputClass}
          value={value.address}
          onChange={(e) => onChange({ address: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">แขวง/ตำบล</label>
          <input
            placeholder="ไม่มี"
            className={inputClass}
            value={value.subdistrict}
            onChange={(e) => onChange({ subdistrict: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">เขต/อำเภอ</label>
          <input
            placeholder="ไม่มี"
            className={inputClass}
            value={value.district}
            onChange={(e) => onChange({ district: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">จังหวัด</label>
          <input
            placeholder="ไม่มี"
            className={inputClass}
            value={value.province}
            onChange={(e) => onChange({ province: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">รหัสไปรษณีย์</label>
          <input
            placeholder="ไม่มี"
            className={inputClass}
            value={value.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">ตำแหน่งบนแผนที่ (ไม่บังคับ)</label>
        <MapPicker
          lat={value.latitude}
          lng={value.longitude}
          onChange={(lat, lng) => onChange({ latitude: lat, longitude: lng })}
        />
      </div>
    </div>
  );
}
