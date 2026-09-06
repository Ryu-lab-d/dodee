'use client';

import { PropertyDetail } from '@/lib/types';

export default function DetailsEditor({
  details,
  onChange,
}: {
  details: PropertyDetail[];
  onChange: (details: PropertyDetail[]) => void;
}) {
  const update = (idx: number, field: keyof PropertyDetail, value: string) => {
    onChange(details.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const remove = (idx: number) => onChange(details.filter((_, i) => i !== idx));

  const add = () => onChange([...details, { label: '', value: '' }]);

  return (
    <div>
      <div className="space-y-2">
        {details.map((d, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              placeholder="หัวข้อ เช่น จำนวนชั้น"
              className="w-1/3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={d.label}
              onChange={(e) => update(idx, 'label', e.target.value)}
            />
            <input
              placeholder="รายละเอียด เช่น 2 ชั้น"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={d.value}
              onChange={(e) => update(idx, 'value', e.target.value)}
            />
            <button
              type="button"
              onClick={() => remove(idx)}
              className="rounded-lg px-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        + เพิ่มรายละเอียด
      </button>
    </div>
  );
}
