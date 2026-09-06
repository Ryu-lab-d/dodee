// Shimmering placeholder blocks shown while a list/table is loading, instead of
// a plain "กำลังโหลด..." text - keeps the page's real layout so nothing jumps
// around once the data arrives.

import type { CSSProperties } from 'react';

export function SkeletonBlock({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton-shimmer rounded-lg bg-slate-200/70 ${className}`} style={style} />;
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <SkeletonBlock className="h-32 w-full rounded-none" />
          <div className="space-y-2 p-5">
            <SkeletonBlock className="h-4 w-2/3" />
            <SkeletonBlock className="h-3 w-1/2" />
            <SkeletonBlock className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ count = 4, cols = 4 }: { count?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <SkeletonBlock className="h-3.5" style={{ width: `${55 + ((i + j) % 3) * 15}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
