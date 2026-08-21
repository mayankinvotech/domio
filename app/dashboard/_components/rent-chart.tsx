'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMoney } from '@/lib/tenancy-types';
import type { ChartPoint } from '@/lib/dashboard';

function compact(v: number): string {
  if (Math.abs(v) >= 1000) return `₹${Math.round(v / 100) / 10}k`;
  return `₹${v}`;
}

type TipProps = {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
};

function CustomTooltip({ active, payload }: TipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const variance = p.collected - p.expected;
  const up = variance >= 0;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 text-xs shadow-xl">
      <p className="mb-1 font-bold text-zinc-900">{p.month}</p>
      <p className="font-medium text-zinc-600">Expected: {formatMoney(p.expected)}</p>
      <p className="font-semibold text-zinc-700">Collected: {formatMoney(p.collected)}</p>
      <p className={`font-semibold ${up ? 'text-emerald-600' : 'text-red-600'}`}>
        Variance: {up ? '+' : '−'}
        {formatMoney(Math.abs(variance))}
      </p>
    </div>
  );
}

// Indian financial year label for "now" (Apr → Mar). e.g. "FY 2026-27".
function currentFinancialYear(): string {
  const now = new Date();
  const start = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return `FY ${start}-${String(start + 1).slice(-2)}`;
}

export default function RentChart({ data }: { data: ChartPoint[] }) {
  const totalExpected = data.reduce((s, d) => s + d.expected, 0);
  const totalCollected = data.reduce((s, d) => s + d.collected, 0);

  return (
    <div className="rounded-2xl border border-[#e1e2e3] bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Rent Collection Progress
          </h2>
          <p className="mt-0.5 text-lg font-bold text-zinc-900">
            {currentFinancialYear()} Overview
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
            <span className="text-zinc-500">Expected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" />
            <span className="text-zinc-900">Collected</span>
          </div>
        </div>
      </div>

      {/* Desktop / tablet: chart */}
      <div className="mt-6 hidden md:block">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f1f4" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#a1a1aa"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              stroke="#a1a1aa"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tickFormatter={compact}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e4e4e7' }} />
            <Area
              type="monotone"
              dataKey="expected"
              stroke="#a1a1aa"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="none"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="collected"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#collectedFill)"
              dot={{ r: 3, fill: '#2563eb' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {totalCollected === 0 && (
        <p className="mt-3 text-center text-xs text-zinc-400">
          No rent payments recorded yet. Payments will appear here once collected.
        </p>
      )}

      {/* Mobile: number summary */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4 md:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Expected (6mo)
          </p>
          <p className="mt-1 text-lg font-bold font-mono text-zinc-900">
            {formatMoney(totalExpected)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Collected (6mo)
          </p>
          <p className="mt-1 text-lg font-bold font-mono text-zinc-700">
            {formatMoney(totalCollected)}
          </p>
        </div>
      </div>
    </div>
  );
}
