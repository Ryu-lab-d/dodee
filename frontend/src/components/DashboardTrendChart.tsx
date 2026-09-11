'use client';

import { useState } from 'react';

interface TrendPoint {
  month: string;
  income: number;
  expense: number;
}

const MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const monthShortLabel = (monthKey: string) => {
  const [, m] = monthKey.split('-').map(Number);
  return MONTH_SHORT[m - 1] || monthKey;
};

const compactBaht = (n: number) => {
  if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `฿${Math.round(n / 1000)}k`;
  return `฿${n}`;
};

// Rounds up to a "nice" axis max (1/2/5 x 10^n) so gridline labels read as clean numbers.
const niceMax = (value: number) => {
  if (value <= 0) return 100;
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return niceFraction * 10 ** exponent;
};

const WIDTH = 640;
const HEIGHT = 220;
const MARGIN = { top: 28, right: 10, bottom: 28, left: 48 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

// Income/expense keep the app-wide green/red convention already used everywhere else
// (recent transactions, invoice amounts). That hue pair is a known weak spot for
// deuteranopia, so identity here never rides on color alone: income is always the left
// bar and expense the right bar within each month group, both carry a text legend, and
// the tooltip/label always name the series in words.
const INCOME_COLOR = '#16a34a';
const EXPENSE_COLOR = '#dc2626';

export default function DashboardTrendChart({ data }: { data: TrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const maxValue = niceMax(Math.max(1, ...data.flatMap((d) => [d.income, d.expense])));
  const groupW = PLOT_W / Math.max(data.length, 1);
  const barW = Math.min(22, groupW * 0.32);
  const barGap = 3;

  const yFor = (value: number) => MARGIN.top + PLOT_H - (value / maxValue) * PLOT_H;
  const lastIndex = data.length - 1;

  const ticks = [0, maxValue / 2, maxValue];

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: INCOME_COLOR }} />
          รายรับ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: EXPENSE_COLOR }} />
          รายจ่าย
        </span>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="กราฟแนวโน้มรายรับ-รายจ่าย 6 เดือนล่าสุด">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
            <text x={MARGIN.left - 8} y={yFor(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[10px] tabular-nums">
              {compactBaht(Math.round(t))}
            </text>
          </g>
        ))}
        <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yFor(0)} y2={yFor(0)} stroke="#cbd5e1" strokeWidth={1} />

        {data.map((d, i) => {
          const groupX = MARGIN.left + i * groupW;
          const centerX = groupX + groupW / 2;
          const incomeX = centerX - barGap / 2 - barW;
          const expenseX = centerX + barGap / 2;
          const isHovered = hovered === i;
          const isLast = i === lastIndex;

          return (
            <g
              key={d.month}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered((h) => (h === i ? null : h))}
              tabIndex={0}
              role="button"
              aria-label={`${monthShortLabel(d.month)} รายรับ ${d.income.toLocaleString()} บาท รายจ่าย ${d.expense.toLocaleString()} บาท`}
              className="cursor-pointer outline-none"
            >
              <rect x={groupX} y={MARGIN.top} width={groupW} height={PLOT_H} fill={isHovered ? '#f1f5f9' : 'transparent'} />

              <rect
                x={incomeX}
                y={yFor(d.income)}
                width={barW}
                height={Math.max(0, yFor(0) - yFor(d.income))}
                rx={4}
                fill={INCOME_COLOR}
                opacity={isHovered || hovered === null ? 1 : 0.45}
              />
              <rect
                x={expenseX}
                y={yFor(d.expense)}
                width={barW}
                height={Math.max(0, yFor(0) - yFor(d.expense))}
                rx={4}
                fill={EXPENSE_COLOR}
                opacity={isHovered || hovered === null ? 1 : 0.45}
              />

              {isLast && (
                <>
                  <text x={incomeX + barW / 2} y={yFor(d.income) - 6} textAnchor="middle" className="fill-slate-600 text-[10px] tabular-nums font-medium">
                    {compactBaht(d.income)}
                  </text>
                  <text x={expenseX + barW / 2} y={yFor(d.expense) - 6} textAnchor="middle" className="fill-slate-600 text-[10px] tabular-nums font-medium">
                    {compactBaht(d.expense)}
                  </text>
                </>
              )}

              <text x={centerX} y={HEIGHT - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">
                {monthShortLabel(d.month)}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered !== null && data[hovered] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{
            left: `${((MARGIN.left + hovered * groupW + groupW / 2) / WIDTH) * 100}%`,
            top: `${(MARGIN.top / HEIGHT) * 100}%`,
          }}
        >
          <p className="mb-1 font-medium text-slate-900">{monthShortLabel(data[hovered].month)}</p>
          <p className="flex items-center justify-between gap-3 tabular-nums">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: INCOME_COLOR }} /> รายรับ
            </span>
            <span className="font-semibold text-slate-900">฿{data[hovered].income.toLocaleString()}</span>
          </p>
          <p className="flex items-center justify-between gap-3 tabular-nums">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: EXPENSE_COLOR }} /> รายจ่าย
            </span>
            <span className="font-semibold text-slate-900">฿{data[hovered].expense.toLocaleString()}</span>
          </p>
        </div>
      )}
    </div>
  );
}
