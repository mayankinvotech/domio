import { formatMoney } from '@/lib/tenancy-types';
import type { DashboardData } from '@/lib/dashboard';

const glassCard =
  'rounded-2xl border border-[#e1e2e3] bg-white p-6 shadow-xs';
const label = 'font-bold text-xs uppercase tracking-wider text-zinc-400';

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  if (!p[0]) return '–';
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// Section 3 (left) — the four most-overdue tenants.
export default function OverdueTenants({ d }: { d: DashboardData }) {
  const rows = d.unitStatuses
    .filter((u) => u.currentBalance < 0 && u.tenantName)
    .sort((a, b) => a.currentBalance - b.currentBalance)
    .slice(0, 4);

  return (
    <div className={glassCard}>
      <div className="flex items-center justify-between">
        <h3 className={label}>Overdue Tenants</h3>
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
          {rows.length} Action Needed
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No overdue tenants 🎉</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((u) => {
            const months =
              u.monthlyRent > 0
                ? Math.ceil(Math.abs(u.currentBalance) / u.monthlyRent)
                : 1;
            return (
              <li key={u.unitId} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-800">
                  {initials(u.tenantName ?? '')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-900">
                    {u.tenantName}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{u.unitName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-sm font-bold tabular-nums text-red-600">
                    {formatMoney(Math.abs(u.currentBalance))}
                  </span>
                  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-bold text-red-600">
                    {months} mo
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
