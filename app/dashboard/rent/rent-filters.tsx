'use client';

import { useRouter } from 'next/navigation';
import { RENT_STATUSES } from '@/lib/rent-types';

const controlClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';

type Current = { status: string; propertyId: string; month: string };

export default function RentFilters({
  properties,
  current,
}: {
  properties: { id: string; name: string }[];
  current: Current;
}) {
  const router = useRouter();

  function apply(next: Current) {
    const params = new URLSearchParams();
    if (next.status) params.set('status', next.status);
    if (next.propertyId) params.set('propertyId', next.propertyId);
    if (next.month) params.set('month', next.month);
    const qs = params.toString();
    router.push('/dashboard/rent' + (qs ? `?${qs}` : ''));
  }

  const hasFilters = current.status || current.propertyId || current.month;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Filter by status"
        value={current.status}
        onChange={(e) => apply({ ...current, status: e.target.value })}
        className={controlClass}
      >
        <option value="">All statuses</option>
        {RENT_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by property"
        value={current.propertyId}
        onChange={(e) => apply({ ...current, propertyId: e.target.value })}
        className={controlClass}
      >
        <option value="">All properties</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <input
        type="month"
        aria-label="Filter by month"
        value={current.month}
        onChange={(e) => apply({ ...current, month: e.target.value })}
        className={controlClass}
      />

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push('/dashboard/rent')}
          className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm font-medium text-[#B0B0C8] transition-colors hover:text-white"
        >
          Clear
        </button>
      )}
    </div>
  );
}
