import { formatMoney } from '@/lib/tenancy-types';
import type { DashboardData } from '@/lib/dashboard';

const glassCard =
  'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm';
const label = 'font-semibold text-xs uppercase tracking-widest text-zinc-400';

// Section 2 (left) — financial-year roll-up, 6 stats in a 3×2 grid.
export default function FyOverview({ d }: { d: DashboardData }) {
  const fyRate =
    d.annualExpected > 0
      ? Math.round((d.collectedFY / d.annualExpected) * 100)
      : 0;
  // Expenses as a share of collected revenue (guard against divide-by-zero).
  const expenseRatio =
    d.collectedFY > 0
      ? `${((d.expensesFY / d.collectedFY) * 100).toFixed(1)}%`
      : '—';

  const stats: {
    label: string;
    value: string;
    color: string;
    sub?: string;
    testid?: boolean;
  }[] = [
    { label: 'Annual Expected', value: formatMoney(d.annualExpected), color: 'text-amber-400' },
    { label: 'Collected · FY', value: formatMoney(d.collectedFY), color: 'text-emerald-400' },
    { label: 'Total Overdue', value: formatMoney(d.totalOverdue), color: 'text-red-400' },
    { label: 'Expenses · FY', value: formatMoney(d.expensesFY), color: 'text-[#f1f5f9]' },
    { label: 'Collection Rate', value: `${fyRate}%`, color: 'text-white', testid: true },
    {
      label: 'Expenses as % of Collected',
      value: expenseRatio,
      color: 'text-[#f1f5f9]',
      sub: 'of collected revenue',
    },
  ];

  return (
    <div className={glassCard}>
      <h3 className={label}>{d.fyLabel} Overview</h3>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            data-testid={s.testid ? 'kpi-card' : undefined}
            className="rounded-xl border border-zinc-100 bg-zinc-50 p-4"
          >
            <p className="font-medium text-[11px] uppercase tracking-wide text-zinc-400">
              {s.label}
            </p>
            <p
              data-testid={s.testid ? 'kpi-value' : undefined}
              className={'mt-1 font-mono text-xl font-bold tabular-nums ' + s.color}
            >
              {s.value}
            </p>
            {s.sub && (
              <p className="mt-0.5 text-[11px] text-zinc-400">{s.sub}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
