'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SubPropertyStatus } from '@prisma/client';
import { SUB_PROPERTY_STATUSES } from '@/lib/sub-property-types';

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
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-[#5B4FE8] focus:ring-2 focus:ring-[#5B4FE8]/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

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
            Floor <span className="text-[#B0B0C8]">(optional)</span>
          </label>
          <input id="floor" name="floor" type="text" defaultValue={unit?.floor ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="areaSqft" className={labelClass}>
            Area (sqft) <span className="text-[#B0B0C8]">(optional)</span>
          </label>
          <input
            id="areaSqft"
            name="areaSqft"
            type="number"
            min="0"
            step="any"
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
          <input
            id="rentAmount"
            name="rentAmount"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={unit?.rentAmount ?? ''}
            className={inputClass}
          />
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
          Notes <span className="text-[#B0B0C8]">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={unit?.notes ?? ''}
          placeholder="Add any additional information about this unit..."
          className={inputClass + ' resize-y'}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-gradient-to-r from-[#5B4FE8] to-[#8B6FE8] px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(91,79,232,0.3)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Unit'}
      </button>
    </form>
  );
}
