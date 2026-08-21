'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { OwnerStructure } from '@/lib/expenses';
import {
  UTILITY_TYPES,
  UTILITY_LEVELS,
  type UtilityLevel,
} from '@/lib/utility-types';

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

export type AccountFormInitial = {
  level: UtilityLevel;
  portfolioId: string;
  propertyId: string;
  subPropertyId: string;
};

export default function AccountForm({
  structure,
  initial,
}: {
  structure: OwnerStructure;
  initial?: AccountFormInitial;
}) {
  const router = useRouter();
  const [level, setLevel] = useState<UtilityLevel>(initial?.level ?? 'PROPERTY');
  const [portfolioId, setPortfolioId] = useState(
    initial?.portfolioId ?? structure[0]?.id ?? '',
  );
  const [propertyId, setPropertyId] = useState(initial?.propertyId ?? '');
  const [unitId, setUnitId] = useState(initial?.subPropertyId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const properties = useMemo(
    () => structure.find((p) => p.id === portfolioId)?.properties ?? [],
    [structure, portfolioId],
  );
  const units = useMemo(
    () => properties.find((p) => p.id === propertyId)?.units ?? [],
    [properties, propertyId],
  );

  function onPortfolioChange(id: string) {
    setPortfolioId(id);
    setPropertyId('');
    setUnitId('');
  }
  function onPropertyChange(id: string) {
    setPropertyId(id);
    setUnitId('');
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const targetId =
      level === 'PORTFOLIO'
        ? portfolioId
        : level === 'PROPERTY'
          ? propertyId
          : unitId;
    if (!targetId) {
      setError('Please select a ' + level.replace('_', ' ').toLowerCase() + '.');
      return;
    }
    setPending(true);
    const d = new FormData(event.currentTarget);
    const res = await fetch('/api/utility-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        targetId,
        type: d.get('type'),
        provider: d.get('provider'),
        accountNumber: d.get('accountNumber'),
        notes: d.get('notes'),
      }),
    });
    if (res.ok) {
      router.push('/dashboard/utilities');
      router.refresh();
      return;
    }
    const json = await res.json().catch(() => null);
    setError(json?.error ?? 'Something went wrong. Please try again.');
    setPending(false);
  }

  if (structure.length === 0) {
    return (
      <p className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[#B0B0C8]">
        Create a portfolio first before adding utility accounts.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className={labelClass}>
          Type
        </label>
        <select id="type" name="type" required defaultValue={initial ? undefined : 'ELECTRICITY'} className={inputClass}>
          {UTILITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="provider" className={labelClass}>
            Provider
          </label>
          <input id="provider" name="provider" type="text" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="accountNumber" className={labelClass}>
            Account Number
          </label>
          <input id="accountNumber" name="accountNumber" type="text" required className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={labelClass}>
          Notes <span className="text-[#B0B0C8]">(optional)</span>
        </label>
        <input id="notes" name="notes" type="text" className={inputClass} />
      </div>

      {/* Level selector — Portfolio / Property / Unit */}
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Level</span>
        <div className="flex flex-wrap gap-2">
          {UTILITY_LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLevel(l.value)}
              className={
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ' +
                (level === l.value
                  ? 'border-zinc-300 bg-zinc-900 text-white'
                  : 'border-[#312D58] bg-[rgba(255,255,255,0.06)] text-[#B0B0C8] hover:text-white')
              }
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cascading: Portfolio → Property → Unit (shown per level) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="portfolio" className={labelClass}>
          Portfolio
        </label>
        <select id="portfolio" value={portfolioId} onChange={(e) => onPortfolioChange(e.target.value)} className={inputClass}>
          <option value="">Select a portfolio…</option>
          {structure.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {level !== 'PORTFOLIO' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="property" className={labelClass}>
            Property
          </label>
          <select id="property" value={propertyId} onChange={(e) => onPropertyChange(e.target.value)} disabled={!portfolioId} className={inputClass}>
            <option value="">Select a property…</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {level === 'UNIT' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="unit" className={labelClass}>
            Unit
          </label>
          <select id="unit" value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!propertyId} className={inputClass}>
            <option value="">Select a unit…</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.unitNumber} — {u.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Create Account'}
      </button>
    </form>
  );
}
