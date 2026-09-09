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
  ClipboardCheck,
  Settings,
  LogOut,
  LogIn,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAttendance } from '@/lib/attendance';
import { useConfirm } from '@/components/ConfirmDialog';
import { api, ApiError } from '@/lib/api';
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
  { href: '/attendance-report', label: 'เวลาทำงาน', icon: ClipboardCheck, ownerOnly: true },
  { href: '/settings', label: 'ตั้งค่า', icon: Settings },
];

function CheckOutButton() {
  const router = useRouter();
  const confirmDialog = useConfirm();
  const { status, refresh } = useAttendance();
  const [working, setWorking] = useState(false);

  if (!status?.checkedIn) return null;

  const doCheckOut = async (confirmEarly: boolean) => {
    setWorking(true);
    try {
      await api.post('/attendance/check-out', confirmEarly ? { confirmEarly: true } : undefined);
      await refresh();
      router.push('/attendance-check-in');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const ok = await confirmDialog({
          title: 'ยังไม่ถึงเวลาเลิกงาน',
          message: `${err.message} คุณแน่ใจหรือไม่ว่าต้องการเช็คชื่อออกงาน?`,
          confirmLabel: 'เช็คชื่อออกงาน',
        });
        if (ok) await doCheckOut(true);
      }
    } finally {
      setWorking(false);
    }
  };

  return (
    <button type="button"
      onClick={() => doCheckOut(false)}
      disabled={working}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 md:px-3"
    >
      <LogIn className="h-3.5 w-3.5 rotate-180" />
      <span className="hidden md:inline">เช็คชื่อออกงาน</span>
    </button>
  );
}

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
          {user?.role !== 'owner' && <CheckOutButton />}
          <button type="button"
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 md:px-3"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* Fixed N-column grid (N = item count): with columns exactly matching the item
          count, this can never wrap to a second row - every item always shares row 1
          with the others, at any count. Tile size steps up at each breakpoint so it
          stays comfortably large on a real desktop without overflowing on a narrower one. */}
      <nav
        className="mx-auto hidden max-w-6xl gap-x-1 gap-y-4 px-6 pb-6 md:grid lg:gap-x-1.5 xl:gap-x-2"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group flex flex-col items-center justify-self-center gap-1.5 lg:gap-2">
              <span
                className={`flex h-[50px] w-[50px] items-center justify-center rounded-2xl border transition-all duration-150 lg:h-16 lg:w-16 lg:rounded-[1.5rem] xl:h-[76px] xl:w-[76px] xl:rounded-[1.75rem] ${
                  active
                    ? 'border-blue-600 bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-200'
                    : 'border-slate-100 bg-slate-50 text-slate-500 shadow-sm group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:shadow-md'
                }`}
              >
                <Icon className="h-[18px] w-[18px] lg:h-6 lg:w-6 xl:h-8 xl:w-8" strokeWidth={active ? 2.1 : 1.8} />
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
