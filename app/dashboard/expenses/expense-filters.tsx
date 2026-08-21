'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { EXPENSE_CATEGORIES } from '@/lib/expense-types';

const controlClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';

type Current = {
  category: string;
  propertyId: string;
  range: string;
  from: string;
  to: string;
};

const RANGES = [
  { value: '', label: 'All time' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'thisYear', label: 'This year' },
  { value: 'custom', label: 'Custom' },
];

export default function ExpenseFilters({
  properties,
  current,
}: {
  properties: { id: string; name: string }[];
  current: Current;
}) {
  const router = useRouter();

  // Buffer the custom-range dates so navigation only fires once BOTH are set
  // (picking just "From" should not reload with a half-applied range).
  const [localFrom, setLocalFrom] = useState(current.from);
  const [localTo, setLocalTo] = useState(current.to);

  // Keep local dates in sync with the URL (e.g. when the range select changes).
  useEffect(() => {
    setLocalFrom(current.from);
    setLocalTo(current.to);
  }, [current.from, current.to]);

  // Navigate only when both custom dates are set and differ from the URL.
  useEffect(() => {
    if (
      localFrom &&
      localTo &&
      (localFrom !== current.from || localTo !== current.to)
    ) {
      apply({ ...current, range: 'custom', from: localFrom, to: localTo });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localFrom, localTo]);

  function apply(next: Current) {
    const params = new URLSearchParams();
    if (next.category) params.set('category', next.category);
    if (next.propertyId) params.set('propertyId', next.propertyId);
    if (next.range && next.range !== 'custom') params.set('range', next.range);
    if (next.range === 'custom') {
      if (next.from) params.set('from', next.from);
      if (next.to) params.set('to', next.to);
    }
    const qs = params.toString();
    router.push('/dashboard/expenses' + (qs ? `?${qs}` : ''));
  }

  // "custom" is active either when explicitly chosen or when from/to are set.
  const rangeValue =
    current.range || (current.from || current.to ? 'custom' : '');
  const isCustom = rangeValue === 'custom';
  const hasFilters =
    current.category || current.propertyId || rangeValue || current.from || current.to;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        aria-label="Filter by category"
        value={current.category}
        onChange={(e) => apply({ ...current, category: e.target.value })}
        className={controlClass}
      >
        <option value="">All categories</option>
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
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

      <select
        aria-label="Filter by date range"
        value={rangeValue}
        onChange={(e) =>
          apply({ ...current, range: e.target.value, from: '', to: '' })
        }
        className={controlClass}
      >
        {RANGES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      {isCustom && (
        <>
          <input
            type="date"
            aria-label="From date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
            className={controlClass}
          />
          <input
            type="date"
            aria-label="To date"
            value={localTo}
            onChange={(e) => setLocalTo(e.target.value)}
            className={controlClass}
          />
        </>
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push('/dashboard/expenses')}
          className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm font-medium text-[#B0B0C8] transition-colors hover:text-white"
        >
          Clear
        </button>
      )}
    </div>
  );
}
