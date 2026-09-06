'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Gauge,
  Receipt,
  Users,
  Menu,
  X,
  Building2,
  Home,
  Wallet,
  NotebookPen,
  CalendarDays,
  UserCog,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const PRIMARY_TABS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/dashboard', label: 'หน้าแรก', icon: LayoutDashboard },
  { href: '/meter-readings', label: 'จดมิเตอร์', icon: Gauge },
  { href: '/invoices', label: 'บิล', icon: Receipt },
  { href: '/tenants', label: 'ผู้เช่า', icon: Users },
];

const MORE_ITEMS: Array<{ href: string; label: string; icon: LucideIcon; ownerOnly?: boolean }> = [
  { href: '/properties', label: 'หอพัก', icon: Building2 },
  { href: '/houses', label: 'บ้าน & คอนโด', icon: Home },
  { href: '/reports', label: 'รายรับ-รายจ่าย', icon: Wallet },
  { href: '/meeting-minutes', label: 'บันทึกการประชุม', icon: NotebookPen },
  { href: '/calendar', label: 'ปฏิทิน', icon: CalendarDays },
  { href: '/staff', label: 'พนักงาน', icon: UserCog, ownerOnly: true },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings },
];

function TabButton({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-transform active:scale-90"
    >
      <Icon
        className={`h-6 w-6 transition-colors ${active ? 'text-blue-600' : 'text-slate-400'}`}
        strokeWidth={active ? 2.3 : 1.9}
      />
      <span className={`text-[10px] transition-colors ${active ? 'font-semibold text-blue-600' : 'text-slate-400'}`}>
        {label}
      </span>
    </Link>
  );
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const moreItems = MORE_ITEMS.filter((item) => !item.ownerOnly || user?.role === 'owner');
  const moreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex items-stretch border-t border-slate-200/70 bg-white/80 px-1 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY_TABS.map((tab) => (
          <TabButton key={tab.href} {...tab} active={isActive(tab.href)} />
        ))}
        <button type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-1.5 transition-transform active:scale-90"
        >
          <Menu className={`h-6 w-6 ${moreActive ? 'text-blue-600' : 'text-slate-400'}`} strokeWidth={moreActive ? 2.3 : 1.9} />
          <span className={`text-[10px] ${moreActive ? 'font-semibold text-blue-600' : 'text-slate-400'}`}>เพิ่มเติม</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <button type="button"
            aria-label="ปิด"
            onClick={() => setMoreOpen(false)}
            className="ios-sheet-backdrop absolute inset-0 bg-slate-900/40"
          />
          <div
            className="ios-sheet-up absolute inset-x-0 bottom-0 rounded-t-3xl bg-white/95 pb-2 pt-3 shadow-2xl backdrop-blur-xl"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
            <div className="mb-2 flex items-center justify-between px-5">
              <p className="text-sm font-semibold text-slate-900">เมนูทั้งหมด</p>
              <button type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 px-5 py-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-transform active:scale-95"
                  >
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                        active ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
                    </span>
                    <span className={`text-center text-[11px] ${active ? 'font-semibold text-blue-700' : 'text-slate-500'}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
