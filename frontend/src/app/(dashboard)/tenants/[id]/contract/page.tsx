'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Tenant } from '@/lib/types';
import { useConfirm } from '@/components/ConfirmDialog';

interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  logoUrl: string;
}

const thaiDate = (iso?: string) => {
  if (!iso) return '__________';
  return new Date(iso).toLocaleDateString('th-TH', { dateStyle: 'long' });
};

function buildDefaultContract(tenant: Tenant, company: CompanyProfile | null) {
  const roomLabel =
    tenant.room?.roomNumber === 'หลัก'
      ? tenant.room?.property?.name
      : `${tenant.room?.property?.name || ''} ห้อง ${tenant.room?.roomNumber || ''}`;

  return `สัญญาเช่าที่อยู่อาศัย

ทำขึ้น ณ วันที่ ${new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}

สัญญาฉบับนี้ทำขึ้นระหว่าง

"ผู้ให้เช่า" ${company?.name || '________________________'}${company?.address ? ` ที่อยู่ ${company.address}` : ''}${company?.phone ? ` โทร ${company.phone}` : ''}

กับ

"ผู้เช่า" ${tenant.name} เลขบัตรประชาชน ${tenant.idCard || '________________________'} เบอร์โทร ${tenant.phone || '-'}

ทั้งสองฝ่ายตกลงทำสัญญาเช่ากันดังมีข้อความต่อไปนี้

1. สถานที่เช่า
${roomLabel || '__________'}

2. ระยะเวลาเช่า
ตั้งแต่วันที่ ${thaiDate(tenant.moveInDate)} ถึงวันที่ ${thaiDate(tenant.contractEndDate)}

3. ค่าเช่า
${tenant.room?.baseRentPrice ? Number(tenant.room.baseRentPrice).toLocaleString() : '__________'} บาท/เดือน ชำระภายในวันที่ 5 ของทุกเดือน

4. เงินมัดจำ
${tenant.depositAmount ? Number(tenant.depositAmount).toLocaleString() : '__________'} บาท ผู้ให้เช่าจะคืนเงินมัดจำเมื่อสิ้นสุดสัญญาและไม่มีความเสียหายต่อทรัพย์สิน

5. หน้าที่ของผู้เช่า
ผู้เช่าตกลงปฏิบัติตามกฎระเบียบของสถานที่เช่าอย่างเคร่งครัด ดูแลรักษาทรัพย์สินที่เช่าด้วยความระมัดระวัง และรับผิดชอบต่อความเสียหายที่เกิดจากการใช้งานของตนเอง

6. การยกเลิกสัญญาก่อนกำหนด
หากผู้เช่าต้องการยกเลิกสัญญาก่อนครบกำหนด ต้องแจ้งให้ผู้ให้เช่าทราบล่วงหน้าอย่างน้อย 30 วัน

7. อื่นๆ
_______________________________________________
_______________________________________________


คู่สัญญาทั้งสองฝ่ายได้อ่านและเข้าใจข้อความในสัญญานี้โดยตลอดแล้ว จึงลงลายมือชื่อไว้เป็นหลักฐาน


ลงชื่อ ................................................ ผู้ให้เช่า
(${company?.name || ''})
วันที่ ................................................


ลงชื่อ ................................................ ผู้เช่า
(${tenant.name})
วันที่ ................................................`;
}

export default function TenantContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const confirmDialog = useConfirm();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Tenant>(`/tenants/${id}`)
      .then((t) => {
        setTenant(t);
        setText(t.contractText || '');
      })
      .catch((err) => setError(err.message));
    api.get<CompanyProfile>('/settings/company').then(setCompany).catch(() => {});
  }, [id]);

  const handleGenerate = async () => {
    if (!tenant) return;
    if (text.trim()) {
      const ok = await confirmDialog({
        title: 'สร้างสัญญาใหม่',
        message: 'มีเนื้อหาสัญญาอยู่แล้ว การสร้างอัตโนมัติใหม่จะเขียนทับเนื้อหาปัจจุบันในกล่องข้อความ (ยังไม่บันทึกจนกว่าจะกดบันทึก) ดำเนินการต่อหรือไม่?',
        confirmLabel: 'สร้างใหม่',
      });
      if (!ok) return;
    }
    setText(buildDefaultContract(tenant, company));
  };

  const handleSave = async () => {
    if (!tenant) return;
    setError(null);
    setSaving(true);
    try {
      await api.put(`/tenants/${tenant.id}`, { contractText: text });
      setNotice('บันทึกสัญญาเช่าสำเร็จ');
      setTimeout(() => setNotice(null), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!tenant) return <p className="text-sm text-slate-400">กำลังโหลด...</p>;

  const propertyType = tenant.room?.property?.type;
  const isSingleUnit = propertyType === 'บ้าน' || propertyType === 'คอนโด';
  const backHref = tenant.room?.property
    ? isSingleUnit
      ? `/houses/${tenant.room.property.id}`
      : `/properties/${tenant.room.property.id}`
    : '/tenants';

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={backHref} className="text-sm text-blue-600 hover:text-blue-700">
          ← กลับ
        </Link>
        <div className="flex flex-wrap gap-2">
          <button type="button"
            onClick={handleGenerate}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            สร้างสัญญาอัตโนมัติ
          </button>
          <button type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            พิมพ์ / PDF
          </button>
        </div>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 print:hidden">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 print:hidden">{notice}</div>}

      <h1 className="mb-3 text-lg font-semibold text-slate-900 print:hidden">สัญญาเช่า - {tenant.name}</h1>

      <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <textarea
          rows={28}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='ยังไม่มีเนื้อหาสัญญา กด "สร้างสัญญาอัตโนมัติ" เพื่อเริ่มต้นจากแบบฟอร์มมาตรฐาน หรือพิมพ์เนื้อหาเองที่นี่ได้เลย'
          className="w-full rounded-xl border border-slate-200 p-4 font-mono text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 print:hidden"
        />
        <pre className="hidden whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-900 print:block">
          {text || 'ยังไม่มีเนื้อหาสัญญา'}
        </pre>
      </div>
    </div>
  );
}
