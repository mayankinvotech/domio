'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PropertyType, PropertyStatus } from '@prisma/client';
import { PROPERTY_TYPES, PROPERTY_STATUSES } from '@/lib/property-types';

type Initial = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  type: PropertyType;
  status: PropertyStatus;
  notes: string | null;
};

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-[#5B4FE8] focus:ring-2 focus:ring-[#5B4FE8]/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

export default function PropertyForm({
  mode,
  portfolioId,
  property,
}: {
  mode: 'create' | 'edit';
  portfolioId: string;
  property?: Initial;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const listHref = `/dashboard/portfolios/${portfolioId}/properties`;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: data.get('name'),
      address: data.get('address'),
      city: data.get('city'),
      country: data.get('country'),
      type: data.get('type'),
      status: data.get('status'),
      notes: data.get('notes'),
      // portfolioId only matters when creating.
      portfolioId,
    };

    const res = await fetch(
      mode === 'edit' ? `/api/properties/${property!.id}` : '/api/properties',
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
        <input id="name" name="name" type="text" required defaultValue={property?.name ?? ''} className={inputClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className={labelClass}>
          Address
        </label>
        <input id="address" name="address" type="text" required defaultValue={property?.address ?? ''} className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className={labelClass}>
            City
          </label>
          <input id="city" name="city" type="text" required defaultValue={property?.city ?? ''} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country" className={labelClass}>
            Country
          </label>
          <input id="country" name="country" type="text" required defaultValue={property?.country ?? ''} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className={labelClass}>
            Type
          </label>
          <select id="type" name="type" required defaultValue={property?.type ?? 'RESIDENTIAL'} className={inputClass}>
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select id="status" name="status" required defaultValue={property?.status ?? 'ACTIVE'} className={inputClass}>
            {PROPERTY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={property?.notes ?? ''}
          placeholder="Add any additional information about this property..."
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
        {pending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Property'}
      </button>
    </form>
  );
}
