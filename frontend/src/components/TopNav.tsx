'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  Gauge,
  Receipt,
  Wallet,
  NotebookPen,
  CalendarDays,
  UserCog,
  ShieldCheck,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import NotificationBell from './NotificationBell';

const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon; ownerOnly?: boolean }> = [
  { href: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { href: '/properties', label: 'หอพัก', icon: Building2 },
  { href: '/houses', label: 'บ้าน & คอนโด', icon: Home },
  { href: '/tenants', label: 'ผู้เช่า', icon: Users },
  { href: '/meter-readings', label: 'จดมิเตอร์', icon: Gauge },
  { href: '/invoices', label: 'บิล & ชำระเงิน', icon: Receipt },
  { href: '/reports', label: 'รายรับ-รายจ่าย', icon: Wallet },
  { href: '/meeting-minutes', label: 'บันทึกการประชุม', icon: NotebookPen },
  { href: '/calendar', label: 'ปฏิทิน', icon: CalendarDays },
  { href: '/staff', label: 'พนักงาน', icon: UserCog, ownerOnly: true },
  { href: '/permissions', label: 'สิทธิ์การใช้งาน', icon: ShieldCheck, ownerOnly: true },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings },
];

export default function TopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.ownerOnly || user?.role === 'owner');

  return (
    <header className="sticky top-0 z-10 border-b border-blue-100 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6 md:py-4">
        <Image
          src="/logo.png"
          alt="DoDee"
          width={200}
          height={145}
          className="logo-breathe h-10 w-auto md:h-16"
          priority
        />
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationBell />
          <div className="hidden text-right md:block">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-400">{user?.role}</p>
          </div>
          <button type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 md:px-3"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Fixed 12-column grid: with at most 12 items (owner) this can never wrap to a
          second row - every item always shares row 1 with the others. Tile size steps
          up at each breakpoint (still always <=12 columns) so it stays comfortably
          large on a real desktop without ever overflowing the row on a narrower one. */}
      <nav className="mx-auto hidden max-w-6xl grid-cols-12 gap-x-1 gap-y-4 px-6 pb-6 md:grid lg:gap-x-1.5 xl:gap-x-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group flex flex-col items-center justify-self-center gap-1.5 lg:gap-2">
              <span
                className={`flex h-[52px] w-[52px] items-center justify-center rounded-2xl border transition-all duration-150 lg:h-[68px] lg:w-[68px] lg:rounded-[1.5rem] xl:h-20 xl:w-20 xl:rounded-[1.75rem] ${
                  active
                    ? 'border-blue-600 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-200'
                    : 'border-slate-100 bg-slate-50 text-slate-500 shadow-sm group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:shadow-md'
                }`}
              >
                <Icon className="h-5 w-5 lg:h-7 lg:w-7 xl:h-9 xl:w-9" strokeWidth={active ? 2.1 : 1.8} />
              </span>
              <span
                className={`text-center text-[9px] leading-tight font-medium lg:text-[11px] xl:text-sm ${active ? 'text-blue-700' : 'text-slate-500'}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
