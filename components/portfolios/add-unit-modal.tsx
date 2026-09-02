'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export type AddUnitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  parentEntityId?: string;
  parentEntityName?: string;
  parentEntityType?: string;
};

const input = 'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/10';
const lbl = 'block text-xs font-semibold text-zinc-700 mb-1';

const VALID_CHILD_TYPES: Record<string, string[]> = {
  PROPERTY: ['FLOOR', 'ROOM', 'OFFICE', 'BED'],
  FLOOR:    ['ROOM', 'OFFICE', 'BED'],
  ROOM:     ['BED'],
  OFFICE:   [],
  BED:      [],
};

const TYPE_LABELS: Record<string, string> = {
  PROPERTY: '?? Whole Property',
  FLOOR:    '??? Floor',
  ROOM:     '?? Room',
  OFFICE:   '?? Office',
  BED:      '??? Bed',
};

const FLAT_UNIT_LABEL = '?? Flat Unit (Standard)';

export default function AddUnitModal({
  isOpen,
  onClose,
  propertyId,
  parentEntityId,
  parentEntityName,
  parentEntityType,
}: AddUnitModalProps) {
  const router = useRouter();

  const [mode, setMode] = useState<'flat' | 'entity'>(parentEntityId ? 'entity' : 'flat');
  const [entityType, setEntityType] = useState<string>(
    parentEntityType ? (VALID_CHILD_TYPES[parentEntityType]?.[0] ?? 'ROOM') : 'FLOOR'
  );
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validChildTypes = parentEntityType ? VALID_CHILD_TYPES[parentEntityType] ?? [] : Object.keys(TYPE_LABELS);

  useEffect(() => {
    if (!isOpen) return;
    setMode(parentEntityId ? 'entity' : 'flat');
    setEntityType(parentEntityType ? (VALID_CHILD_TYPES[parentEntityType]?.[0] ?? 'ROOM') : 'FLOOR');
    setName(''); setCode(''); setUnitNumber(''); setFloor('');
    setRentAmount(''); setAreaSqft(''); setNotes('');
    setError(null); setSuccess(false); setPending(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const rent = Number(rentAmount);
    if (!Number.isFinite(rent) || rent < 0) { setError('Please enter a valid rent amount.'); return; }

    setPending(true);
    try {
      if (mode === 'flat') {
        const res = await fetch('/api/sub-properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId, name, unitNumber: unitNumber || code || name,
            floor: floor || null, rentAmount: rent,
            areaSqft: areaSqft ? Number(areaSqft) : null,
            notes: notes || null,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) { setError(json?.error ?? 'Failed to add unit.'); return; }
      } else {
        const res = await fetch('/api/rentable-entities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId, type: entityType,
            name, code: code || name.slice(0, 8).toUpperCase().replace(/\s+/g, '-'),
            parentId: parentEntityId || null,
            rentAmount: rent,
            areaSqft: areaSqft ? Number(areaSqft) : null,
            status: 'VACANT',
            notes: notes || null,
          }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) { setError(json?.error ?? 'Failed to add unit.'); return; }
      }
      setSuccess(true);
      setTimeout(() => { router.refresh(); onClose(); }, 900);
    } catch { setError('Network error.'); }
    finally { setPending(false); }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Add Unit"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !pending) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-lg">
              {parentEntityId ? '?' : '???'}
            </span>
            <div>
              <h2 className="text-base font-bold text-zinc-900">
                {parentEntityId ? `Add Sub-unit` : 'Add Unit'}
              </h2>
              {parentEntityName && (
                <p className="text-xs text-zinc-500">Under: {parentEntityName}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={pending}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
            ?
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Mode toggle */}
          {!parentEntityId && (
            <div>
              <label className={lbl}>Unit Type</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setMode('flat')}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${mode === 'flat' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}>
                  {FLAT_UNIT_LABEL}
                </button>
                <button type="button" onClick={() => setMode('entity')}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${mode === 'entity' ? 'border-blue-600 bg-blue-600 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}>
                  ??? Hierarchy Unit
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-400">
                {mode === 'flat'
                  ? 'Standard unit (apartment, shop, etc.) with a single rent.'
                  : 'Hierarchical unit (floor ? room ? bed) for complex structures.'}
              </p>
            </div>
          )}

          {/* Entity type selector */}
          {mode === 'entity' && (
            <div>
              <label className={lbl}>
                {parentEntityId ? `Sub-unit Type (under ${parentEntityType})` : 'Hierarchy Level'}
              </label>
              <div className="flex flex-wrap gap-2">
                {(parentEntityId ? validChildTypes : Object.keys(TYPE_LABELS)).map((t) => (
                  <button key={t} type="button" onClick={() => setEntityType(t)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${entityType === t ? 'border-blue-600 bg-blue-600 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}>
                    {TYPE_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className={lbl}>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={mode === 'flat' ? 'e.g. Apartment 3B' : 'e.g. Floor 1, Room 2A, Bed B'}
              className={input} required />
          </div>

          {/* Code / Unit Number */}
          {mode === 'entity' ? (
            <div>
              <label className={lbl}>Short Code</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. F1, R2A, BD-B (auto-generated if blank)"
                className={input} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Unit Number *</label>
                <input type="text" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g. A101, 3B" className={input} required />
              </div>
              <div>
                <label className={lbl}>Floor</label>
                <input type="text" value={floor} onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. Ground, 1st" className={input} />
              </div>
            </div>
          )}

          {/* Rent & Area */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Listed Rent *</label>
              <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-xs focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/10 transition">
                <span className="shrink-0 flex items-center justify-center border-r border-zinc-200 bg-zinc-100/70 px-3 text-sm font-bold text-zinc-600 select-none">
                  ?
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(e.target.value)}
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base font-semibold font-mono text-zinc-900 outline-none placeholder:text-zinc-400 placeholder:font-sans placeholder:font-normal"
                  required
                />
              </div>
            </div>
            <div>
              <label className={lbl}>Area (sqft)</label>
              <input type="number" min="0" step="any" value={areaSqft}
                onChange={(e) => setAreaSqft(e.target.value)} placeholder="Optional" className={input} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={lbl}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Optional notes…" className={input + ' resize-none'} />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
              ? Unit added! Refreshing…
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} disabled={pending}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={pending || success}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
              {pending ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Adding…</>
              ) : mode === 'flat' ? '+ Add Unit' : '+ Add Hierarchy Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
