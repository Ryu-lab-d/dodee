'use client';

import { useEffect, useRef, useState, type ReactNode, type SVGProps } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  Home,
  Users,
  Gauge,
  Receipt,
  Wallet,
  NotebookPen,
  UserCog,
  Settings,
  Bell,
  Check,
  X,
  Smartphone,
  Cloud,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';

function Reveal({
  children,
  className = '',
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} ${className}`}
    >
      {children}
    </div>
  );
}

const MODULES: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: Building2, title: 'จัดการหอพัก', desc: 'จัดการทรัพย์สินหลายห้อง เช่น หอพัก อพาร์ตเมนต์ ครบทุกห้องในที่เดียว' },
  { icon: Home, title: 'บ้าน & คอนโด', desc: 'ดูแลบ้านเช่าและคอนโดแบบห้องเดียว แยกจากระบบหอพักให้จัดการง่ายขึ้น' },
  { icon: Users, title: 'จัดการผู้เช่า', desc: 'บันทึกข้อมูลผู้เช่า สัญญาเช่า วันครบกำหนด แจ้งเตือนล่วงหน้าอัตโนมัติ' },
  { icon: Gauge, title: 'จดมิเตอร์น้ำ-ไฟ', desc: 'บันทึกค่ามิเตอร์รายเดือน คำนวณหน่วยการใช้ให้อัตโนมัติ ลดความผิดพลาด' },
  { icon: Receipt, title: 'ออกบิล & รับชำระเงิน', desc: 'สร้างใบแจ้งหนี้อัตโนมัติจากค่าเช่าและค่ามิเตอร์ พร้อมพิมพ์ใบเสร็จ' },
  { icon: Wallet, title: 'รายงานการเงิน', desc: 'สรุปรายรับ-รายจ่ายแบบเรียลไทม์ บันทึกรายการเองได้ พร้อมส่งออกข้อมูล' },
  { icon: Bell, title: 'แจ้งเตือนผ่าน LINE', desc: 'ส่งการ์ดแจ้งเตือนสวยงามผ่าน LINE OA อัตโนมัติ ทั้งสัญญาใกล้หมดและค้างชำระ' },
  { icon: NotebookPen, title: 'บันทึกการประชุม', desc: 'จดบันทึกการประชุมทีมงาน ส่งเป็นการ์ดสรุปให้ทุกคนผ่าน LINE ได้ทันที' },
  { icon: UserCog, title: 'พนักงาน & สิทธิ์การใช้งาน', desc: 'กำหนดสิทธิ์พนักงานแต่ละคน พร้อมบันทึกกิจกรรม (activity log) ตรวจสอบย้อนหลังได้' },
  { icon: Settings, title: 'ตั้งค่าบริษัท', desc: 'ตั้งค่าข้อมูลบริษัท โลโก้ และการเชื่อมต่อ LINE OA ได้ด้วยตัวเอง' },
];

const COMPARISON: Array<{ label: string; dodee: boolean; legacy: boolean }> = [
  { label: 'แจ้งเตือนอัตโนมัติผ่าน LINE เป็นการ์ดสวยงาม', dodee: true, legacy: false },
  { label: 'รองรับภาษาไทยและรูปแบบที่อยู่ไทยเต็มรูปแบบ', dodee: true, legacy: false },
  { label: 'ใช้งานได้ลื่นไหลทั้งบนคอมพิวเตอร์และมือถือ', dodee: true, legacy: false },
  { label: 'แยกจัดการหอพักและบ้าน/คอนโดตามลักษณะทรัพย์สิน', dodee: true, legacy: false },
  { label: 'กำหนดสิทธิ์พนักงานพร้อมบันทึกกิจกรรมตรวจสอบย้อนหลัง', dodee: true, legacy: false },
  { label: 'ข้อมูลเก็บบนคลาวด์ เข้าถึงได้ทุกที่ ไม่ต้องกลัวสมุดหาย', dodee: true, legacy: false },
];

function BrowserFrame({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        <span className="ml-2 truncate text-[11px] text-slate-400">{title}</span>
      </div>
      <div className="bg-sky-50 p-4">{children}</div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <BrowserFrame title="do-dee.vercel.app/dashboard">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'ห้องว่าง', value: '4', color: 'from-blue-500 to-blue-700' },
          { label: 'รายได้เดือนนี้', value: '฿86,400', color: 'from-emerald-500 to-emerald-700' },
          { label: 'ค้างชำระ', value: '2 ราย', color: 'from-rose-500 to-rose-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl bg-gradient-to-br ${s.color} p-3 text-white shadow-sm`}>
            <p className="text-[10px] opacity-80">{s.label}</p>
            <p className="text-sm font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-xl border border-slate-100 bg-white p-3">
        <p className="mb-2 text-[11px] font-semibold text-slate-700">แจ้งเตือนล่าสุด</p>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-slate-100" />
          <div className="h-1.5 w-4/5 rounded-full bg-slate-100" />
          <div className="h-1.5 w-3/5 rounded-full bg-slate-100" />
        </div>
      </div>
    </BrowserFrame>
  );
}

function InvoiceMockup() {
  return (
    <BrowserFrame title="do-dee.vercel.app/invoices">
      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-800">ใบแจ้งหนี้ #INV-0912</p>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-medium text-amber-700">รอชำระ</span>
        </div>
        {[
          ['ค่าเช่าห้อง 204', '3,500.00'],
          ['ค่าน้ำ (8 หน่วย)', '160.00'],
          ['ค่าไฟ (45 หน่วย)', '337.50'],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between border-b border-slate-50 py-1 text-[10px] text-slate-500">
            <span>{label}</span>
            <span>{val}</span>
          </div>
        ))}
        <div className="mt-1.5 flex justify-between text-[11px] font-bold text-blue-700">
          <span>ยอดรวม</span>
          <span>฿3,997.50</span>
        </div>
      </div>
    </BrowserFrame>
  );
}

function LineCardMockup() {
  return (
    <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-2">
        <p className="text-[11px] font-bold text-white">⏰ แจ้งเตือนสัญญาใกล้หมดอายุ</p>
      </div>
      <div className="space-y-1 px-3 py-2.5">
        <p className="text-[10px] text-slate-500">ห้อง 204 · คุณสมชาย ใจดี</p>
        <p className="text-[10px] text-slate-500">สัญญาหมดอายุ: 15 ก.ย. 2569</p>
        <p className="text-[10px] text-slate-500">เหลือเวลา 9 วัน</p>
      </div>
      <div className="border-t border-slate-100 px-3 py-2">
        <div className="rounded-lg bg-blue-50 py-1.5 text-center text-[10px] font-semibold text-blue-600">
          ดูรายละเอียดผู้เช่า
        </div>
      </div>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="mx-auto w-full max-w-[220px] overflow-hidden rounded-[1.75rem] border-4 border-slate-800 bg-white shadow-xl">
      <div className="bg-sky-50 px-3 pb-3 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <Image src="/icon.png" alt="" width={64} height={64} className="h-6 w-6" />
          <p className="text-xs font-bold text-blue-700">แดชบอร์ด</p>
        </div>
        <div className="space-y-2">
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <div className="h-1.5 w-2/3 rounded-full bg-slate-100" />
            <div className="mt-1.5 h-1.5 w-1/3 rounded-full bg-slate-100" />
          </div>
          <div className="rounded-xl bg-white p-2.5 shadow-sm">
            <div className="h-1.5 w-3/4 rounded-full bg-slate-100" />
            <div className="mt-1.5 h-1.5 w-1/2 rounded-full bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="flex justify-around border-t border-slate-100 bg-white/95 py-2">
        {[LayoutDashboardMini, Building2, Receipt, Users].map((Icon, i) => (
          <Icon key={i} className={`h-4 w-4 ${i === 0 ? 'text-blue-600' : 'text-slate-300'}`} />
        ))}
      </div>
    </div>
  );
}

function LayoutDashboardMini(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

const STEPS = [
  { title: 'เพิ่มทรัพย์สินและห้องพัก', desc: 'สร้างหอพัก บ้าน หรือคอนโด พร้อมรูปภาพและตำแหน่งบนแผนที่' },
  { title: 'เพิ่มผู้เช่าและสัญญา', desc: 'ผูกผู้เช่าเข้ากับห้อง กำหนดวันเริ่มและวันหมดสัญญา' },
  { title: 'จดมิเตอร์น้ำ-ไฟรายเดือน', desc: 'บันทึกค่ามิเตอร์ ระบบคำนวณหน่วยและค่าใช้จ่ายให้อัตโนมัติ' },
  { title: 'ระบบออกบิลให้อัตโนมัติ', desc: 'รวมค่าเช่าและค่ามิเตอร์เป็นใบแจ้งหนี้ พร้อมพิมพ์หรือส่งให้ผู้เช่า' },
  { title: 'รับชำระและติดตามยอดค้าง', desc: 'บันทึกการชำระเงิน ระบบแจ้งเตือนอัตโนมัติเมื่อใกล้ครบกำหนดหรือค้างชำระ' },
  { title: 'ดูรายงานสรุปภาพรวมธุรกิจ', desc: 'ตรวจสอบรายรับ-รายจ่ายและผลประกอบการได้ทุกที่ ทุกเวลา' },
];

export default function AboutPage() {
  const [heroIn, setHeroIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex-1 bg-white text-slate-800">
      <header className="sticky top-0 z-20 border-b border-blue-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Image src="/logo.png" alt="DoDee" width={172} height={152} className="h-9 w-auto" priority />
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            เข้าสู่ระบบ
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 to-white px-5 pb-16 pt-14 sm:pt-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 lg:flex-row lg:items-center">
          <div className="flex-1 text-center lg:text-left">
            <div
              className={`mx-auto mb-6 w-fit transition-all duration-700 ease-out lg:mx-0 ${
                heroIn ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
            >
              <Image src="/icon.png" alt="Do Dee" width={256} height={256} className="h-16 w-16" priority />
            </div>
            <h1
              className={`text-3xl font-extrabold leading-tight text-slate-900 transition-all delay-150 duration-700 ease-out sm:text-4xl lg:text-5xl ${
                heroIn ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
            >
              บริหารหอพัก อพาร์ตเมนต์ และคอนโด
              <br />
              <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">ครบวงจรในที่เดียว</span>
            </h1>
            <p
              className={`mx-auto mt-5 max-w-xl text-base text-slate-500 transition-all delay-300 duration-700 ease-out lg:mx-0 ${
                heroIn ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
            >
              Do Dee คือระบบจัดการทรัพย์สินให้เช่าสำหรับเจ้าของกิจการไทย ตั้งแต่จดมิเตอร์ ออกบิล รับชำระเงิน
              ไปจนถึงแจ้งเตือนผู้เช่าอัตโนมัติผ่าน LINE — ใช้งานง่าย ลื่นไหล ทั้งบนคอมพิวเตอร์และมือถือ
            </p>
            <div
              className={`mt-8 flex flex-wrap items-center justify-center gap-3 transition-all delay-500 duration-700 ease-out lg:justify-start ${
                heroIn ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
              }`}
            >
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
              >
                เข้าสู่ระบบ Do Dee
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                ดูฟีเจอร์ทั้งหมด
              </a>
            </div>
          </div>

          <div
            className={`flex-1 transition-all delay-300 duration-700 ease-out ${
              heroIn ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}
          >
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* What is Do Dee */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">Do Dee คืออะไร</p>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            ระบบบริหารจัดการทรัพย์สินให้เช่า ที่ออกแบบมาเพื่อเจ้าของกิจการโดยเฉพาะ
          </h2>
          <p className="mt-4 text-slate-500">
            แทนที่สมุดจดและไฟล์ Excel ด้วยระบบเดียวที่ครอบคลุมทุกขั้นตอนการบริหารหอพัก อพาร์ตเมนต์ บ้านเช่า
            และคอนโด ตั้งแต่รับผู้เช่าเข้าอยู่ ไปจนถึงปิดยอดบัญชีประจำเดือน
          </p>
        </Reveal>

        <div id="features" className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <Reveal key={m.title} delayMs={(i % 3) * 100}>
              <div className="h-full rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <m.icon className="h-6 w-6" />
                </span>
                <p className="font-semibold text-slate-900">{m.title}</p>
                <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Advantages / comparison */}
      <section className="bg-slate-50 px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">ทำไมต้อง Do Dee</p>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">ดีกว่าสมุดจดและระบบทั่วไปอย่างไร</h2>
          </Reveal>

          <Reveal className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 bg-slate-900 px-5 py-3 text-sm font-semibold text-white sm:gap-6">
              <span>คุณสมบัติ</span>
              <span className="w-16 text-center text-blue-300 sm:w-24">Do Dee</span>
              <span className="w-16 text-center text-slate-400 sm:w-24">สมุดจด / ระบบทั่วไป</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 px-5 py-3.5 text-sm sm:gap-6 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                <span className="text-slate-700">{row.label}</span>
                <span className="flex w-16 justify-center sm:w-24">
                  <Check className="h-5 w-5 rounded-full bg-emerald-100 p-1 text-emerald-600" />
                </span>
                <span className="flex w-16 justify-center sm:w-24">
                  <X className="h-5 w-5 rounded-full bg-red-100 p-1 text-red-500" />
                </span>
              </div>
            ))}
          </Reveal>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: Cloud, title: 'เข้าถึงได้ทุกที่', desc: 'ข้อมูลอยู่บนคลาวด์ เปิดดูได้ทันทีทั้งที่บ้านหรือหน้างาน' },
              { icon: Smartphone, title: 'ลื่นไหลบนมือถือ', desc: 'ดีไซน์ปรับให้เหมาะกับมือถือโดยอัตโนมัติ ใช้งานสะดวกเหมือนแอปจริง' },
              { icon: ShieldCheck, title: 'ปลอดภัยและตรวจสอบได้', desc: 'กำหนดสิทธิ์พนักงานแต่ละคน พร้อมบันทึกกิจกรรมย้อนหลังทุกการเปลี่ยนแปลง' },
            ].map((f) => (
              <Reveal key={f.title}>
                <div className="h-full rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm">
                  <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <p className="font-semibold text-slate-900">{f.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Screens showcase */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">ตัวอย่างหน้าจอ</p>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">ใช้งานง่าย สวยงาม ทั้งคอมและมือถือ</h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 items-start gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal className="sm:col-span-2 lg:col-span-2">
            <p className="mb-3 text-center text-sm font-medium text-slate-500">แดชบอร์ดภาพรวมธุรกิจ</p>
            <DashboardMockup />
          </Reveal>
          <Reveal>
            <p className="mb-3 text-center text-sm font-medium text-slate-500">ใบแจ้งหนี้อัตโนมัติ</p>
            <InvoiceMockup />
          </Reveal>
          <Reveal>
            <p className="mb-3 text-center text-sm font-medium text-slate-500">แจ้งเตือนผ่าน LINE</p>
            <LineCardMockup />
          </Reveal>
        </div>
        <Reveal className="mt-8 flex justify-center">
          <div>
            <p className="mb-3 text-center text-sm font-medium text-slate-500">หน้าจอบนมือถือ</p>
            <PhoneMockup />
          </div>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 px-5 py-16">
        <div className="mx-auto max-w-3xl">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-600">วิธีการใช้งาน</p>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">เริ่มต้นใช้งานได้ใน 6 ขั้นตอน</h2>
          </Reveal>

          <div className="mt-10 space-y-4">
            {STEPS.map((s, i) => (
              <Reveal key={s.title}>
                <div className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{s.title}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{s.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-16">
        <Reveal className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 px-8 py-12 text-center text-white shadow-xl">
          <Sparkles className="mx-auto mb-4 h-8 w-8 text-blue-200" />
          <h2 className="text-2xl font-bold sm:text-3xl">พร้อมเปลี่ยนการบริหารหอพักให้ง่ายขึ้นแล้วหรือยัง?</h2>
          <p className="mx-auto mt-3 max-w-xl text-blue-100">
            Do Dee ช่วยให้คุณดูแลทรัพย์สินทุกแห่งได้จากที่เดียว ลดงานซ้ำซ้อน และไม่พลาดทุกการแจ้งเตือนสำคัญ
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex items-center gap-1.5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-lg transition hover:bg-blue-50"
          >
            เริ่มใช้งาน Do Dee
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      <footer className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3">
          <Image src="/logo.png" alt="DoDee" width={172} height={152} className="h-7 w-auto opacity-80" />
          <p className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            ระบบบริหารจัดการหอพัก อพาร์ตเมนต์ และคอนโด
          </p>
        </div>
      </footer>
    </div>
  );
}
