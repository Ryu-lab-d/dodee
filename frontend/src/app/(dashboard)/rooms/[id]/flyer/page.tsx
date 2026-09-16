'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { MapPin, Phone, Download, Printer, Home } from 'lucide-react';
import { api, fileUrl } from '@/lib/api';
import { Room, Property } from '@/lib/types';

interface CompanyProfile {
  name: string;
  phone: string;
  logoUrl: string;
}

type RoomWithProperty = Room & { property?: Property };

const locationLine = (property?: Property) =>
  [property?.subdistrict, property?.district, property?.province].filter(Boolean).join(', ');

export default function RoomFlyerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [room, setRoom] = useState<RoomWithProperty | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [callQr, setCallQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<RoomWithProperty>(`/rooms/${id}`).then(setRoom).catch((err) => setError(err.message));
    api.get<CompanyProfile>('/settings/company').then(setCompany).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!company?.phone) {
      setCallQr(null);
      return;
    }
    QRCode.toDataURL(`tel:${company.phone.replace(/[^0-9+]/g, '')}`, { margin: 1, width: 180 })
      .then(setCallQr)
      .catch(() => setCallQr(null));
  }, [company?.phone]);

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    setDownloading(true);
    try {
      // Tailwind v4 generates colors as oklch()/lab() - the original html2canvas can't
      // parse those (throws mid-render), so this uses the maintained fork that added
      // modern CSS color function support instead.
      const html2canvas = (await import('html2canvas-pro')).default;
      const canvas = await html2canvas(flyerRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `ป้ายประกาศ-${room?.property?.name || 'หอง'}-${room?.roomNumber || ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!room) return <p className="text-sm text-slate-400">กำลังโหลด...</p>;

  const photo = room.images?.[0] || room.property?.images?.[0];
  const roomLabel = room.roomNumber === 'หลัก' ? room.property?.name : `${room.property?.name} ห้อง ${room.roomNumber}`;
  const details = [...(room.details || []), ...(room.property?.details || [])].filter((d) => d.label && d.value);
  const backHref = room.property?.type && room.property.type !== 'หอพัก' ? `/houses/${room.propertyId}` : `/properties/${room.propertyId}`;

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
        <Link href={backHref} className="text-sm text-blue-600 hover:text-blue-700">
          ← กลับ
        </Link>
        <div className="flex gap-2">
          <button type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Download size={15} />
            {downloading ? 'กำลังสร้างรูป...' : 'ดาวน์โหลดเป็นรูปภาพ'}
          </button>
          <button type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Printer size={15} />
            พิมพ์
          </button>
        </div>
      </div>

      <div
        ref={flyerRef}
        className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0"
      >
        {/* Hero photo with gradient + price overlay */}
        <div className="relative aspect-[4/5] w-full bg-gradient-to-br from-cyan-600 to-blue-800">
          {photo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={fileUrl(photo)} alt="" className="absolute inset-0 h-full w-full object-cover" crossOrigin="anonymous" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/20 to-slate-900/10" />

          <span className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 shadow-md">
            <Home size={13} strokeWidth={2.5} />
            ห้องว่าง ให้เช่า
          </span>

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-lg font-semibold leading-tight drop-shadow">{roomLabel}</p>
            {locationLine(room.property) && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-200">
                <MapPin size={12} />
                {locationLine(room.property)}
              </p>
            )}
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold tracking-tight text-amber-300 drop-shadow">
                ฿{Number(room.baseRentPrice).toLocaleString()}
              </span>
              <span className="text-sm font-medium text-slate-200">/ เดือน</span>
            </p>
          </div>
        </div>

        {/* Details card */}
        <div className="space-y-4 p-5">
          {details.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {details.slice(0, 8).map((d, i) => (
                <span key={i} className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  {d.label}: {d.value}
                </span>
              ))}
            </div>
          )}

          {room.description && <p className="text-sm leading-relaxed text-slate-600">{room.description}</p>}

          <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="text-xs text-slate-400">สนใจติดต่อ</p>
              <p className="mt-0.5 text-lg font-bold text-slate-900">{company?.name || 'DoDee'}</p>
              {company?.phone && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                  <Phone size={14} />
                  {company.phone}
                </p>
              )}
            </div>
            {callQr && (
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={callQr} alt="สแกนเพื่อโทร" width={76} height={76} className="rounded-lg border border-slate-200 p-1" />
                <p className="text-[9px] text-slate-400">สแกนเพื่อโทร</p>
              </div>
            )}
          </div>

          <p className="text-center text-[10px] text-slate-300">สร้างด้วยระบบ DoDee</p>
        </div>
      </div>
    </div>
  );
}
