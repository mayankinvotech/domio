'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { PropertyWithVacantUnits } from '@/lib/tenancies';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currencies';

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-[#5B4FE8] focus:ring-2 focus:ring-[#5B4FE8]/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function nextYearISO() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

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

  // Fully controlled date state — never resets on re-render
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(nextYearISO);
  const [securityDeposit, setSecurityDeposit] = useState('0');
  const [paymentDay, setPaymentDay] = useState('1');

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

    if (!startDate || !endDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date.');
      return;
    }
    if (!unitId) {
      setError('Please select a vacant unit to assign.');
      return;
    }

    const rentNum = Number(rent);
    if (!Number.isFinite(rentNum) || rentNum < 0) {
      setError('Please enter a valid monthly rent amount.');
      return;
    }

    setPending(true);
    const allVacantUnits = available.flatMap((p) => p.vacantUnits);
    const selectedUnit = allVacantUnits.find((u) => u.id === unitId) ?? units.find((u) => u.id === unitId);
    const isEntity = selectedUnit?.isRentableEntity ?? false;

    try {
      const res = await fetch('/api/tenancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          subPropertyId: isEntity ? undefined : unitId,
          rentableEntityId: isEntity ? unitId : undefined,
          startDate,
          endDate,
          monthlyRent: rentNum,
          securityDeposit: securityDeposit ? Number(securityDeposit) : 0,
          paymentDayOfMonth: paymentDay ? Number(paymentDay) : 1,
        }),
      });

      if (res.ok) {
        router.push(`/dashboard/tenants/${tenantId}`);
        router.refresh();
        return;
      }
      const json = await res.json().catch(() => null);
      const msg = json?.error || json?.message || 'Failed to assign unit. Please try again.';
      setError(msg);
    } catch {
      setError('Network error occurred. Please check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  if (available.length === 0) {
    return (
      <div className="rounded-xl border border-[#312D58] bg-[rgba(255,255,255,0.04)] p-6 text-center">
        <p className="text-base font-semibold text-white">No Vacant Units Available</p>
        <p className="mt-1 text-sm text-[#B0B0C8]">
          All units across your properties are currently occupied. Add a new unit or terminate an existing lease to make a unit vacant.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="property" className={labelClass}>
          Select Property
        </label>
        <select
          id="property"
          value={propertyId}
          onChange={(e) => onPropertyChange(e.target.value)}
          className={inputClass}
        >
          {available.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#17152F] text-white">
              {p.name} ({p.vacantUnits.length} vacant {p.vacantUnits.length === 1 ? 'unit' : 'units'})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="unit" className={labelClass}>
          Unit <span className="text-[#B0B0C8] font-normal">(vacant only)</span>
        </label>
        <select
          id="unit"
          value={unitId}
          onChange={(e) => onUnitChange(e.target.value)}
          className={inputClass}
        >
          {units.map((u) => (
            <option key={u.id} value={u.id} className="bg-[#17152F] text-white">
              {u.unitNumber} — {u.name} (Listed: ₹{u.rentAmount.toLocaleString()}/mo)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="startDate" className={labelClass}>
            Lease Start Date
          </label>
          <input
            id="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endDate" className={labelClass}>
            Lease End Date
          </label>
          <input
            id="endDate"
            type="date"
            required
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="monthlyRent" className={labelClass}>
            Monthly Rent
          </label>
          <div className="flex overflow-hidden rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] focus-within:border-[#5B4FE8] focus-within:ring-2 focus-within:ring-[#5B4FE8]/20 transition">
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="shrink-0 border-r border-[#312D58] bg-transparent px-2.5 py-2 text-xs font-bold text-[#E8E8F2] outline-none cursor-pointer"
              style={{ width: '4.5rem' }}
              aria-label="Currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-[#17152F] text-white">
                  {c.symbol} {c.code}
                </option>
              ))}
            </select>
            <input
              id="monthlyRent"
              type="number"
              min="0"
              step="any"
              required
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base font-semibold text-white outline-none placeholder:text-[#B0B0C8] placeholder:font-normal"
              placeholder="0.00"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="securityDeposit" className={labelClass}>
            Security Deposit
          </label>
          <input
            id="securityDeposit"
            type="number"
            min="0"
            step="any"
            value={securityDeposit}
            onChange={(e) => setSecurityDeposit(e.target.value)}
            className={inputClass}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="paymentDayOfMonth" className={labelClass}>
            Payment Due Day (1–28)
          </label>
          <input
            id="paymentDayOfMonth"
            type="number"
            min="1"
            max="28"
            step="1"
            required
            value={paymentDay}
            onChange={(e) => setPaymentDay(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-medium text-red-300">
          ⚠️ {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !unitId}
        className="mt-2 rounded-xl bg-gradient-to-r from-[#5B4FE8] to-[#8B6FE8] py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(91,79,232,0.3)] transition-all hover:opacity-90 active:scale-98 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
      >
        {pending ? 'Assigning Unit & Creating Lease…' : '✓ Assign Unit & Activate Lease'}
      </button>
    </form>
  );
}
