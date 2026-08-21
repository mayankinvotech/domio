import { formatMoney } from '@/lib/tenancy-types';
import type { RecentActivityItem } from '@/lib/dashboard';

const glassCard =
  'rounded-2xl border border-[#e1e2e3] bg-white p-6 shadow-xs';
const label = 'font-bold text-xs uppercase tracking-wider text-zinc-400';

// Section 3 (right) — last few payment/expense events.
export default function RecentActivity({
  items,
}: {
  items: RecentActivityItem[];
}) {
  const rows = items.slice(0, 5);
  return (
    <div className={glassCard}>
      <div className="flex items-center justify-between">
        <h3 className={label}>Recent Activity</h3>
        <span className="text-xs font-semibold text-zinc-400">Real-time Feed</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No recent activity.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((a) => {
            const isPayment = a.kind === 'payment';
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-2.5">
                <span
                  className={
                    'h-2.5 w-2.5 shrink-0 rounded-full ' +
                    (isPayment ? 'bg-emerald-500' : 'bg-amber-500')
                  }
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-900">
                    {a.description}{' '}
                    <span
                      className={
                        'font-mono font-bold tabular-nums ' +
                        (isPayment ? 'text-emerald-600' : 'text-amber-600')
                      }
                    >
                      {formatMoney(a.amount)}
                    </span>
                  </p>
                  <p className="truncate text-xs text-zinc-500">{a.sub}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="rounded-md bg-zinc-200/70 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-700">
                    {a.monthTag}
                  </span>
                  <span className="text-[10px] text-zinc-400">{a.when}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
