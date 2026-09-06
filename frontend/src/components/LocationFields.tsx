'use client';

import { useEffect, useState } from 'react';
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

interface Province { id: number; name: string }
interface District { id: number; name: string; provinceId: number }
interface SubDistrict { id: number; name: string; districtId: number; zip: number }
interface ThaiAddressData { provinces: Province[]; districts: District[]; subDistricts: SubDistrict[] }

let cachedData: Promise<ThaiAddressData> | null = null;
const loadThaiAddressData = () => {
  if (!cachedData) {
    cachedData = fetch('/thai-address.json').then((res) => res.json());
  }
  return cachedData;
};

export default function LocationFields({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (patch: Partial<LocationValue>) => void;
}) {
  const [data, setData] = useState<ThaiAddressData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadThaiAddressData().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
  const selectClass = `${inputClass} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`;

  const selectedProvince = data?.provinces.find((p) => p.name === value.province);
  const districtOptions = data && selectedProvince ? data.districts.filter((d) => d.provinceId === selectedProvince.id) : [];
  const selectedDistrict = districtOptions.find((d) => d.name === value.district);
  const subDistrictOptions = data && selectedDistrict ? data.subDistricts.filter((s) => s.districtId === selectedDistrict.id) : [];

  const handleProvinceChange = (name: string) => {
    onChange({ province: name, district: '', subdistrict: '', postalCode: '' });
  };

  const handleDistrictChange = (name: string) => {
    onChange({ district: name, subdistrict: '', postalCode: '' });
  };

  const handleSubdistrictChange = (name: string) => {
    const match = subDistrictOptions.find((s) => s.name === name);
    onChange({ subdistrict: name, postalCode: match ? String(match.zip) : value.postalCode });
  };

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
          <label className="mb-1 block text-sm font-medium text-slate-700">จังหวัด</label>
          <select
            className={selectClass}
            value={value.province}
            onChange={(e) => handleProvinceChange(e.target.value)}
            disabled={!data}
          >
            <option value="">{data ? 'เลือกจังหวัด' : 'กำลังโหลด...'}</option>
            {data?.provinces.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">เขต/อำเภอ</label>
          <select
            className={selectClass}
            value={value.district}
            onChange={(e) => handleDistrictChange(e.target.value)}
            disabled={!selectedProvince}
          >
            <option value="">{selectedProvince ? 'เลือกเขต/อำเภอ' : 'เลือกจังหวัดก่อน'}</option>
            {districtOptions.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">แขวง/ตำบล</label>
          <select
            className={selectClass}
            value={value.subdistrict}
            onChange={(e) => handleSubdistrictChange(e.target.value)}
            disabled={!selectedDistrict}
          >
            <option value="">{selectedDistrict ? 'เลือกแขวง/ตำบล' : 'เลือกเขต/อำเภอก่อน'}</option>
            {subDistrictOptions.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">รหัสไปรษณีย์</label>
          <input
            placeholder="ไม่มี"
            className={inputClass}
            value={value.postalCode}
            onChange={(e) => onChange({ postalCode: e.target.value })}
          />
          <p className="mt-0.5 text-[11px] text-slate-400">เติมให้อัตโนมัติ แก้ไขเองได้</p>
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
