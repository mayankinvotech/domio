'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { PropertyWithVacantUnits } from '@/lib/tenancies';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currencies';

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-[#5B4FE8] focus:ring-2 focus:ring-[#5B4FE8]/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

export default function AssignForm({
  tenantId,
  properties,
}: {
  tenantId: string;
  properties: PropertyWithVacantUnits[];
}) {
  const router = useRouter();

  // Only properties that currently have vacant units can be assigned.
  const available = useMemo(
    () => properties.filter((p) => p.vacantUnits.length > 0),
    [properties],
  );

  const [propertyId, setPropertyId] = useState(available[0]?.id ?? '');
  const units = useMemo(
    () => available.find((p) => p.id === propertyId)?.vacantUnits ?? [],
    [available, propertyId],
  );
  const [unitId, setUnitId] = useState(units[0]?.id ?? '');
  const [rent, setRent] = useState(String(units[0]?.rentAmount ?? ''));
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onPropertyChange(id: string) {
    setPropertyId(id);
    const next = available.find((p) => p.id === id)?.vacantUnits ?? [];
    setUnitId(next[0]?.id ?? '');
    setRent(String(next[0]?.rentAmount ?? ''));
  }

  function onUnitChange(id: string) {
    setUnitId(id);
    const u = units.find((x) => x.id === id);
    if (u) setRent(String(u.rentAmount));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const d = new FormData(event.currentTarget);
    const startDate = d.get('startDate') as string;
    const endDate = d.get('endDate') as string;
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date');
      return;
    }

    setPending(true);
    const selectedUnit = units.find((u) => u.id === unitId);
    const isEntity = selectedUnit?.isRentableEntity ?? false;

    const res = await fetch('/api/tenancies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId,
        subPropertyId: isEntity ? undefined : unitId,
        rentableEntityId: isEntity ? unitId : undefined,
        startDate: d.get('startDate'),
        endDate: d.get('endDate'),
        monthlyRent: rent,
        securityDeposit: d.get('securityDeposit'),
        paymentDayOfMonth: d.get('paymentDayOfMonth'),
      }),
    });

    if (res.ok) {
      router.push(`/dashboard/tenants/${tenantId}`);
      router.refresh();
      return;
    }
    const json = await res.json().catch(() => null);
    setError(json?.error || json?.message || `Failed to assign unit (HTTP ${res.status}). Please try again.`);
    setPending(false);
  }

  if (available.length === 0) {
    return (
      <p className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[#B0B0C8]">
        No vacant units available. Add a unit or free one up first.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="property" className={labelClass}>
          Property
        </label>
        <select
          id="property"
          value={propertyId}
          onChange={(e) => onPropertyChange(e.target.value)}
          className={inputClass}
        >
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="unit" className={labelClass}>
          Unit <span className="text-[#B0B0C8]">(vacant only)</span>
        </label>
        <select
          id="unit"
          value={unitId}
          onChange={(e) => onUnitChange(e.target.value)}
          className={inputClass}
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              Unit {u.unitNumber} — {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className={labelClass}>
            Start Date
          </label>
          <input id="startDate" name="startDate" type="date" required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className={labelClass}>
            End Date
          </label>
          <input id="endDate" name="endDate" type="date" required className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="monthlyRent" className={labelClass}>
            Monthly Rent
          </label>
          <div className="flex overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-xs focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 transition">
            <select
              id="currency"
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="shrink-0 border-r border-zinc-200 bg-zinc-50 px-2.5 py-2.5 text-sm font-semibold text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100 transition"
              style={{ minWidth: '6.5rem' }}
              aria-label="Currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
            <input
              id="monthlyRent"
              name="monthlyRent"
              type="number"
              min="0"
              step="any"
              required
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              className="min-w-0 flex-1 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="securityDeposit" className={labelClass}>
            Security Deposit
          </label>
          <input
            id="securityDeposit"
            name="securityDeposit"
            type="number"
            min="0"
            step="any"
            defaultValue="0"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="paymentDayOfMonth" className={labelClass}>
            Payment Day (1–28)
          </label>
          <input
            id="paymentDayOfMonth"
            name="paymentDayOfMonth"
            type="number"
            min="1"
            max="28"
            step="1"
            defaultValue="1"
            required
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !unitId}
        className="mt-2 rounded-full bg-gradient-to-r from-[#5B4FE8] to-[#8B6FE8] px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(91,79,232,0.3)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Assigning…' : 'Assign to Unit'}
      </button>
    </form>
  );
}
