import Link from 'next/link';
import { formatMoney } from '@/lib/tenancy-types';
import type { DashboardData, UnitStatus } from '@/lib/dashboard';

const glassCard =
  'rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] p-5 backdrop-blur-md ' +
  'shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]';
const label = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500';

const BORDER: Record<UnitStatus['status'], string> = {
  paid: '#22c55e',
  amber: '#E8A020',
  overdue: '#ef4444',
  vacant: '#18181b',
};
const LEGEND: { status: UnitStatus['status']; text: string }[] = [
  { status: 'paid', text: 'Paid' },
  { status: 'amber', text: '1 month' },
  { status: 'overdue', text: '2+ months' },
  { status: 'vacant', text: 'Vacant' },
];

// Section 4 — per-unit status grid.
export default function UnitStatusGrid({ d }: { d: DashboardData }) {
  return (
    <div className={glassCard}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={label}>Unit Status · {d.propertyName}</h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#B0B0C8]">
          {LEGEND.map((l) => (
            <span key={l.status} className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: BORDER[l.status] }}
                aria-hidden
              />
              {l.text}
            </span>
          ))}
        </div>
      </div>

      {d.unitStatuses.length === 0 ? (
        <p className="mt-4 text-sm text-[#6A6A8A]">No units yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {d.unitStatuses.map((u) => {
            const owed = u.currentBalance < 0;
            return (
              <Link
                key={u.unitId}
                href={u.href}
                className="rounded-xl border border-zinc-200 bg-[#100d24] p-3 transition-colors hover:bg-[#141130]"
                style={{ borderLeftColor: BORDER[u.status], borderLeftWidth: 4 }}
              >
                <p className="truncate text-sm font-semibold text-white">
                  {u.unitName}
                </p>
                <p className="truncate text-xs text-[#6A6A8A]">
                  {u.tenantName ?? 'Vacant'}
                </p>
                <p
                  className={
                    'mt-2 text-sm font-bold ' +
                    (u.status === 'vacant'
                      ? 'text-zinc-500'
                      : owed
                        ? 'text-red-400'
                        : 'text-green-400')
                  }
                >
                  {u.status === 'vacant'
                    ? '—'
                    : owed
                      ? `↓ ${formatMoney(Math.abs(u.currentBalance))}`
                      : `✓ ${formatMoney(u.currentBalance)}`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
