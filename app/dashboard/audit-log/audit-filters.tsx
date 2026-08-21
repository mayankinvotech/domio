'use client';

import { useRouter } from 'next/navigation';

const controlClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';

type Current = { entity: string; action: string };

export default function AuditFilters({ current }: { current: Current }) {
  const router = useRouter();

  function apply(next: Current) {
    const params = new URLSearchParams();
    if (next.entity) params.set('entity', next.entity);
    if (next.action) params.set('action', next.action);
    const qs = params.toString();
    router.push('/dashboard/audit-log' + (qs ? `?${qs}` : ''));
  }

  const hasFilters = current.entity || current.action;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Filter by ledger"
        value={current.entity}
        onChange={(e) => apply({ ...current, entity: e.target.value })}
        className={controlClass}
      >
        <option value="">All ledgers</option>
        <option value="LEDGER_ENTRY">Transactions</option>
        <option value="RENT_LEDGER">Rent records</option>
      </select>

      <select
        aria-label="Filter by action"
        value={current.action}
        onChange={(e) => apply({ ...current, action: e.target.value })}
        className={controlClass}
      >
        <option value="">All actions</option>
        <option value="CREATE">Created</option>
        <option value="UPDATE">Edited</option>
        <option value="DELETE">Deleted</option>
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push('/dashboard/audit-log')}
          className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm font-medium text-[#B0B0C8] transition-colors hover:text-white"
        >
          Clear
        </button>
      )}
    </div>
  );
}
