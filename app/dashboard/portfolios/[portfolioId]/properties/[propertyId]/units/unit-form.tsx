'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SubPropertyStatus } from '@prisma/client';
import { SUB_PROPERTY_STATUSES } from '@/lib/sub-property-types';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currencies';

type Initial = {
  id: string;
  name: string;
  unitNumber: string;
  floor: string | null;
  areaSqft: number | null;
  rentAmount: number;
  status: SubPropertyStatus;
  notes: string | null;
};

const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-zinc-700';

export default function UnitForm({
  mode,
  propertyId,
  listHref,
  unit,
}: {
  mode: 'create' | 'edit';
  propertyId: string;
  listHref: string;
  unit?: Initial;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: data.get('name'),
      unitNumber: data.get('unitNumber'),
      floor: data.get('floor'),
      areaSqft: data.get('areaSqft'),
      rentAmount: data.get('rentAmount'),
      currency,
      status: data.get('status'),
      notes: data.get('notes'),
      // propertyId only matters when creating.
      propertyId,
    };

    const res = await fetch(
      mode === 'edit' ? `/api/sub-properties/${unit!.id}` : '/api/sub-properties',
      {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (res.ok) {
      router.push(listHref);
      router.refresh();
      return;
    }

    const json = await res.json().catch(() => null);
    setError(json?.error ?? 'Something went wrong. Please try again.');
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input id="name" name="name" type="text" required defaultValue={unit?.name ?? ''} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="unitNumber" className={labelClass}>
          Unit Number
        </label>
        <input id="unitNumber" name="unitNumber" type="text" required defaultValue={unit?.unitNumber ?? ''} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="floor" className={labelClass}>
            Floor <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input id="floor" name="floor" type="text" placeholder="e.g. 1st Floor" defaultValue={unit?.floor ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="areaSqft" className={labelClass}>
            Area (sqft) <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <input
            id="areaSqft"
            name="areaSqft"
            type="number"
            min="0"
            step="any"
            placeholder="—"
            defaultValue={unit?.areaSqft ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rentAmount" className={labelClass}>
            Rent Amount
          </label>
          {/* Currency + Amount combined input */}
          <div className="flex overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-xs focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 transition">
            <select
              id="currency"
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="shrink-0 border-r border-zinc-200 bg-zinc-50 px-2.5 py-2.5 text-sm font-semibold text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100 transition"
              style={{ minWidth: '7rem' }}
              aria-label="Currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
            <input
              id="rentAmount"
              name="rentAmount"
              type="number"
              min="0"
              step="any"
              required
              placeholder="0"
              defaultValue={unit?.rentAmount ?? ''}
              className="min-w-0 flex-1 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select id="status" name="status" required defaultValue={unit?.status ?? 'VACANT'} className={inputClass}>
            {SUB_PROPERTY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={labelClass}>
          Notes <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={unit?.notes ?? ''}
          placeholder="Add any additional information about this unit..."
          className={inputClass + ' resize-y'}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Unit'}
      </button>
    </form>
  );
}
