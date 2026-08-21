'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { OwnerStructure } from '@/lib/expenses';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_LEVELS,
  type ExpenseLevel,
} from '@/lib/expense-types';

type Initial = {
  id: string;
  level: ExpenseLevel;
  portfolioId: string | null;
  propertyId: string | null;
  subPropertyId: string | null;
  category: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string | null;
};

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

export type ExpenseInitialSelection = {
  level: ExpenseLevel;
  portfolioId: string;
  propertyId: string;
  subPropertyId: string;
};

export default function ExpenseForm({
  mode,
  structure,
  expense,
  initial,
}: {
  mode: 'create' | 'edit';
  structure: OwnerStructure;
  expense?: Initial;
  // Create-mode pre-fill (e.g. from a unit's "Add Expense" link).
  initial?: ExpenseInitialSelection;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seed = expense ?? initial;
  const [level, setLevel] = useState<ExpenseLevel>(seed?.level ?? 'PROPERTY');
  const [portfolioId, setPortfolioId] = useState(
    seed?.portfolioId ?? structure[0]?.id ?? '',
  );
  const [propertyId, setPropertyId] = useState(seed?.propertyId ?? '');
  const [unitId, setUnitId] = useState(seed?.subPropertyId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

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
      setError('Please select a ' + level.toLowerCase() + '.');
      return;
    }

    setPending(true);
    const d = new FormData(event.currentTarget);
    const payload = {
      level,
      targetId,
      category: d.get('category'),
      amount: d.get('amount'),
      date: d.get('date'),
      description: d.get('description'),
    };
    const res = await fetch(
      mode === 'edit' ? `/api/expenses/${expense!.id}` : '/api/expenses',
      {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (res.ok) {
      // Brief success feedback, then return to the list preserving any filters.
      setSuccess(true);
      const qs = searchParams.toString();
      setTimeout(() => {
        router.push(`/dashboard/expenses${qs ? '?' + qs : ''}`);
        router.refresh();
      }, 1000);
      return;
    }
    const json = await res.json().catch(() => null);
    setError(json?.error ?? 'Something went wrong. Please try again.');
    setPending(false);
  }

  if (structure.length === 0) {
    return (
      <p className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm text-[#B0B0C8]">
        Create a portfolio first before recording expenses.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="date" className={labelClass}>
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={expense?.date ?? new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className={labelClass}>
            Category
          </label>
          <select
            id="category"
            name="category"
            required
            defaultValue={expense?.category ?? 'MAINTENANCE'}
            className={inputClass}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="amount" className={labelClass}>
          Amount
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          min="0"
          step="any"
          required
          defaultValue={expense?.amount ?? ''}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className={labelClass}>
          Description <span className="text-[#B0B0C8]">(optional)</span>
        </label>
        <input
          id="description"
          name="description"
          type="text"
          defaultValue={expense?.description ?? ''}
          className={inputClass}
        />
      </div>

      {/* Level selector */}
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Level</span>
        <div className="flex gap-2">
          {EXPENSE_LEVELS.map((l) => (
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

      {/* Cascading target dropdowns */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="portfolio" className={labelClass}>
          Portfolio
        </label>
        <select
          id="portfolio"
          value={portfolioId}
          onChange={(e) => onPortfolioChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Select a portfolio…</option>
          {structure.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {(level === 'PROPERTY' || level === 'UNIT') && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="property" className={labelClass}>
            Property
          </label>
          <select
            id="property"
            value={propertyId}
            onChange={(e) => onPropertyChange(e.target.value)}
            disabled={!portfolioId}
            className={inputClass}
          >
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
          <select
            id="unit"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            disabled={!propertyId}
            className={inputClass}
          >
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

      {success && (
        <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
          ✓ Expense saved successfully
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Expense'}
      </button>
    </form>
  );
}
