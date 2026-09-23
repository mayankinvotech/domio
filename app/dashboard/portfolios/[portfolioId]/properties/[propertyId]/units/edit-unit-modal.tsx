'use client';

import { useEffect, useState } from 'react';
import type { SubPropertyStatus } from '@prisma/client';
import { RENTABLE_ENTITY_TYPE_LABELS } from '@/lib/rentable-entities';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currencies';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';

export type EditableUnit = {
  id: string;
  name: string;
  code?: string | null;
  type?: string;
  status: SubPropertyStatus;
  rentAmount: number;
  areaSqft?: number | null;
  notes?: string | null;
  hasChildren?: boolean;
  hasActiveLease?: boolean;
  activeTenantName?: string | null;
  isRentableEntity?: boolean;
};

const TYPE_ICONS: Record<string, string> = {
  PROPERTY: '🏢',
  FLOOR: '🏗️',
  ROOM: '🚪',
  OFFICE: '💼',
  BED: '🛏️',
  UNIT: '🚪',
};

export default function EditUnitModal({
  isOpen,
  unit,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  unit: EditableUnit | null;
  onClose: () => void;
  onSaved?: (updated: EditableUnit) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [rentAmount, setRentAmount] = useState<string>('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [status, setStatus] = useState<SubPropertyStatus>('VACANT');
  const [areaSqft, setAreaSqft] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useScrollLock(isOpen && !!unit);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen && !!unit);

  useEffect(() => {
    if (unit) {
      setName(unit.name || '');
      setCode(unit.code || '');
      setRentAmount(unit.rentAmount !== undefined ? String(unit.rentAmount) : '0');
      setStatus(unit.status || 'VACANT');
      setAreaSqft(unit.areaSqft !== undefined && unit.areaSqft !== null ? String(unit.areaSqft) : '');
      setNotes(unit.notes || '');
      setError(null);
    }
  }, [unit]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, pending, onClose]);

  if (!isOpen || !unit) return null;

  const entityType = unit.type?.toUpperCase() || 'ROOM';
  const typeLabel =
    RENTABLE_ENTITY_TYPE_LABELS[entityType as keyof typeof RENTABLE_ENTITY_TYPE_LABELS] ||
    entityType.charAt(0) + entityType.slice(1).toLowerCase();
  const icon = TYPE_ICONS[entityType] || '🚪';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!unit) return;

    setError(null);
    setPending(true);

    const rentNum = parseFloat(rentAmount);
    if (isNaN(rentNum) || rentNum < 0) {
      setError('Please enter a valid non-negative rent amount.');
      setPending(false);
      return;
    }

    if (!name.trim()) {
      setError('Unit name cannot be empty.');
      setPending(false);
      return;
    }

    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      unitNumber: code.trim() || undefined,
      status,
      rentAmount: rentNum,
      areaSqft: areaSqft.trim() ? parseFloat(areaSqft) : null,
      notes: notes.trim() || null,
    };

    try {
      // First try rentable-entities PATCH; if 404, fall back to sub-properties PATCH
      const primaryUrl = `/api/rentable-entities/${unit.id}`;
      let res = await fetch(primaryUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/sub-properties/${unit.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Failed to update unit');
      }

      const updatedData: EditableUnit = {
        ...unit,
        name: payload.name,
        code: payload.code || unit.code,
        status: payload.status,
        rentAmount: payload.rentAmount,
        areaSqft: payload.areaSqft,
        notes: payload.notes,
      };

      if (onSaved) {
        onSaved(updatedData);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving';
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        ref={trapRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-zinc-200 text-lg shadow-2xs">
              {icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-900">
                  Edit {typeLabel}
                </h2>
              </div>
              <p className="text-xs text-zinc-500">
                Change status, price, and entity information
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200/60 hover:text-zinc-700 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
            >
              {error}
            </div>
          )}

          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center justify-between">
              <span>Status <span className="text-red-500 font-bold ml-0.5">*</span></span>
              {unit.hasActiveLease && (
                <span className="text-[11px] font-normal text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  👤 Active lease: {unit.activeTenantName || 'Tenant'}
                </span>
              )}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('VACANT')}
                className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition cursor-pointer ${
                  status === 'VACANT'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <span className="text-sm">🟢</span>
                <span className="mt-1 text-xs font-bold">Vacant</span>
                <span className="text-[10px] text-zinc-400">Available</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('OCCUPIED')}
                className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition cursor-pointer ${
                  status === 'OCCUPIED'
                    ? 'border-blue-500 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <span className="text-sm">🔵</span>
                <span className="mt-1 text-xs font-bold">Occupied</span>
                <span className="text-[10px] text-zinc-400">Leased</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('MAINTENANCE')}
                className={`flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition cursor-pointer ${
                  status === 'MAINTENANCE'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                <span className="text-sm">🟡</span>
                <span className="mt-1 text-xs font-bold">Maintenance</span>
                <span className="text-[10px] text-zinc-400">Repairs</span>
              </button>
            </div>
            {unit.hasChildren && (
              <p className="text-[11px] text-zinc-500 italic">
                Note: This unit contains sub-units. In tree and flowchart views, sub-unit statuses are also rolled up for overview.
              </p>
            )}
          </div>

          {/* Price / Rent Amount */}
          <div className="space-y-1.5">
            <label htmlFor="edit-rent" className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Price / Rent Amount (Monthly) <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <div className="flex overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-xs focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 transition">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="shrink-0 border-r border-zinc-200 bg-zinc-50 px-2.5 py-2.5 text-xs font-bold text-zinc-800 outline-none cursor-pointer hover:bg-zinc-100 transition"
                style={{ width: '4.75rem' }}
                aria-label="Currency"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code}
                  </option>
                ))}
              </select>
              <input
                id="edit-rent"
                type="number"
                min="0"
                step="any"
                required
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                placeholder="0.00"
                className="min-w-0 flex-1 bg-white px-3.5 py-2.5 text-base font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
              />
            </div>
            {unit.hasChildren && (
              <p className="text-[11px] text-zinc-500">
                Direct asking rent for this entity. Sub-units have their own rent and roll up into this entity.
              </p>
            )}
          </div>

          {/* Unit Name & Code in 2 columns */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="edit-name" className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Name <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                id="edit-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="edit-code" className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                Code / Identifier <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <input
                id="edit-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. 101, F1, BED-A"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
          </div>

          {/* Area sqft */}
          <div className="space-y-1.5">
            <label htmlFor="edit-area" className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Area (sqft) <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              id="edit-area"
              type="number"
              min="0"
              step="any"
              value={areaSqft}
              onChange={(e) => setAreaSqft(e.target.value)}
              placeholder="e.g. 350"
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="edit-notes" className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Notes <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="edit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes, amenities, or features..."
              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 resize-y"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 disabled:opacity-60 cursor-pointer"
            >
              {pending ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving…</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
