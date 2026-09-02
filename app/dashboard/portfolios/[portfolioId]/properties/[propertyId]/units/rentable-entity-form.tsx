'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { RentableEntityType } from '@prisma/client';
import { SUB_PROPERTY_STATUSES } from '@/lib/sub-property-types';
import {
  RENTABLE_ENTITY_TYPE_LABELS,
  VALID_PARENT_TYPES,
  type RentableEntityNode,
} from '@/lib/rentable-entities';
import { CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currencies';

const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-zinc-700';

const ENTITY_TYPES: { value: RentableEntityType; label: string; description: string; icon: string }[] = [
  { value: 'PROPERTY', label: 'Whole Property', description: 'Lease the entire building', icon: '🏢' },
  { value: 'FLOOR', label: 'Floor', description: 'A single floor / level', icon: '🏗️' },
  { value: 'ROOM', label: 'Room', description: 'A room (under floor or property)', icon: '🚪' },
  { value: 'OFFICE', label: 'Office', description: 'Office space (under floor or property)', icon: '💼' },
  { value: 'BED', label: 'Bed', description: 'A bed (under room or floor)', icon: '🛏️' },
];

/** Flatten a RentableEntityNode tree into a list for the parent picker. */
function flattenTree(
  nodes: RentableEntityNode[],
  depth = 0,
): { id: string; label: string; type: RentableEntityType }[] {
  const result: { id: string; label: string; type: RentableEntityType }[] = [];
  for (const node of nodes) {
    result.push({
      id: node.id,
      label: `${'  '.repeat(depth)}${RENTABLE_ENTITY_TYPE_LABELS[node.type]}: ${node.name} (${node.code})`,
      type: node.type,
    });
    result.push(...flattenTree(node.children, depth + 1));
  }
  return result;
}

export default function AddRentableEntityForm({
  portfolioId,
  propertyId,
  propertyName,
  propertyAddress,
  properties = [],
  listHref,
}: {
  portfolioId?: string;
  propertyId: string;
  propertyName?: string;
  propertyAddress?: string;
  properties?: { id: string; name: string; address?: string }[];
  listHref: string;
}) {
  const router = useRouter();
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId);
  const [entityType, setEntityType] = useState<RentableEntityType>('FLOOR');
  const [parentId, setParentId] = useState<string>('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [existingEntities, setExistingEntities] = useState<RentableEntityNode[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Sync selected property with prop
  useEffect(() => {
    setSelectedPropertyId(propertyId);
  }, [propertyId]);

  // Load existing entities for the parent picker
  useEffect(() => {
    setLoadingEntities(true);
    fetch(`/api/rentable-entities?propertyId=${selectedPropertyId}`)
      .then((r) => r.json())
      .then((d) => {
        const entities: RentableEntityNode[] = d.entities ?? [];
        setExistingEntities(entities);
        setLoadingEntities(false);
      })
      .catch(() => setLoadingEntities(false));
  }, [selectedPropertyId]);

  const needsParent = VALID_PARENT_TYPES[entityType].length > 0;
  const validParents = flattenTree(existingEntities).filter((e) =>
    VALID_PARENT_TYPES[entityType].includes(e.type),
  );

  // Automatically select the default parent entity whenever validParents is available
  useEffect(() => {
    if (needsParent && validParents.length > 0) {
      if (!parentId || !validParents.some((p) => p.id === parentId)) {
        setParentId(validParents[0].id);
      }
    } else if (!needsParent) {
      setParentId('');
    }
  }, [entityType, validParents, needsParent, parentId]);

  function handlePropertySwitch(newPropId: string) {
    setSelectedPropertyId(newPropId);
    if (portfolioId) {
      router.push(`/dashboard/portfolios/${portfolioId}/properties/${newPropId}/units/new`);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(e.currentTarget);
    const payload = {
      propertyId: selectedPropertyId,
      type: entityType,
      name: data.get('name'),
      code: data.get('code'),
      parentId: parentId || null,
      areaSqft: data.get('areaSqft') || null,
      currency,
      rentAmount: data.get('rentAmount'),
      status: data.get('status'),
      notes: data.get('notes') || null,
    };

    const res = await fetch('/api/rentable-entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push(listHref);
      router.refresh();
      return;
    }

    const json = await res.json().catch(() => null);
    setError(json?.error ?? 'Something went wrong. Please try again.');
    setPending(false);
  }

  const currentProp = properties.find((p) => p.id === selectedPropertyId) || {
    id: selectedPropertyId,
    name: propertyName || 'Selected Property',
    address: propertyAddress,
  };

  return (
    <div className="space-y-6">
      {/* Target Property Context Card */}
      <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/70 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-zinc-200 text-lg shadow-xs">
              🏠
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Adding Unit To Property
              </p>
              <h2 className="font-bold text-zinc-900 text-base sm:text-lg">
                {currentProp.name}
              </h2>
              {currentProp.address && (
                <p className="text-xs text-zinc-500 font-medium">
                  {currentProp.address}
                </p>
              )}
            </div>
          </div>

          {properties.length > 1 && (
            <div className="sm:self-center">
              <label htmlFor="propertySwitcher" className="sr-only">Switch Property</label>
              <select
                id="propertySwitcher"
                value={selectedPropertyId}
                onChange={(e) => handlePropertySwitch(e.target.value)}
                className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs outline-none hover:border-zinc-300"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Entity Type Selector */}
      <div>
        <p className={labelClass + ' mb-3'}>What are you renting out?</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {ENTITY_TYPES.map((et) => {
            const isSelected = entityType === et.value;
            return (
              <button
                key={et.value}
                type="button"
                onClick={() => setEntityType(et.value)}
                className={
                  'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all duration-150 ' +
                  (isSelected
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm ring-2 ring-zinc-900/10'
                    : 'border-zinc-200 bg-zinc-50/60 text-zinc-700 hover:border-zinc-300 hover:bg-white')
                }
              >
                <span className="text-xl sm:text-2xl">{et.icon}</span>
                <span
                  className={
                    'text-xs font-bold ' +
                    (isSelected ? 'text-white' : 'text-zinc-900')
                  }
                >
                  {et.label}
                </span>
                <span
                  className={
                    'text-[10px] leading-tight line-clamp-2 ' +
                    (isSelected ? 'text-zinc-300' : 'text-zinc-500')
                  }
                >
                  {et.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={onSubmit} autoComplete="off" className="flex flex-col gap-4">
        {/* Parent entity picker (shown when the selected type requires a parent) */}
        {needsParent && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="parentId" className={labelClass}>
              Parent Entity{' '}
              <span className="text-zinc-400 font-normal">
                (must be: {VALID_PARENT_TYPES[entityType].map((t) => RENTABLE_ENTITY_TYPE_LABELS[t]).join(' or ')})
              </span>
            </label>
            {loadingEntities ? (
              <p className="text-xs text-zinc-500 font-medium">Loading parent entities…</p>
            ) : validParents.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-medium text-amber-800">
                <p className="font-semibold mb-0.5">⚠️ No compatible parent entities found</p>
                Create a <strong>{VALID_PARENT_TYPES[entityType].map((t) => RENTABLE_ENTITY_TYPE_LABELS[t]).join(' or ')}</strong> first, then nest this {entityType.toLowerCase()} inside it.
              </div>
            ) : (
              <select
                id="parentId"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                required
                className={inputClass}
              >
                {validParents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Name + Code */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClass}>
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="off"
              placeholder={`e.g. "${entityType === 'FLOOR' ? 'Ground Floor' : entityType === 'ROOM' ? 'Room 3A' : entityType === 'OFFICE' ? 'Suite 201' : entityType === 'BED' ? 'Bed B' : 'Main Building'}"`}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className={labelClass}>
              Short Code / Unit Number
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              autoComplete="off"
              placeholder={`e.g. "${entityType === 'FLOOR' ? 'GF' : entityType === 'ROOM' ? '101' : entityType === 'OFFICE' ? '201' : entityType === 'BED' ? 'B1' : 'MAIN'}"`}
              className={inputClass}
            />
          </div>
        </div>

        {/* Rent + Area */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rentAmount" className={labelClass}>
              Listed Rent Amount
            </label>
            {/* Currency + Amount combined input */}
            <div className="flex overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-xs focus-within:border-zinc-900 focus-within:ring-2 focus-within:ring-zinc-900/10 transition">
              <select
                id="currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="shrink-0 border-r border-zinc-200 bg-zinc-50 px-2.5 py-2.5 text-sm font-bold text-zinc-800 outline-none cursor-pointer hover:bg-zinc-100 transition"
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
                id="rentAmount"
                name="rentAmount"
                type="number"
                min="0"
                step="any"
                required
                placeholder="0.00"
                className="min-w-0 flex-1 bg-white px-3.5 py-2.5 text-base font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 placeholder:font-normal"
              />
            </div>
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
              className={inputClass}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entityStatus" className={labelClass}>
            Status
          </label>
          <select id="entityStatus" name="status" defaultValue="VACANT" className={inputClass}>
            {SUB_PROPERTY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entityNotes" className={labelClass}>
            Notes <span className="text-zinc-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="entityNotes"
            name="notes"
            rows={3}
            placeholder="Any additional details about this unit…"
            className={inputClass + ' resize-y'}
          />
        </div>

        {/* Hierarchy preview */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 mb-1">
            Hierarchy Structure &amp; Skip-Level Rules
          </p>
          <p className="text-xs text-zinc-700 font-medium">
            {entityType === 'PROPERTY' && 'Property (whole building) → Direct lease on the entire building.'}
            {entityType === 'FLOOR' && 'Property → Floor → Direct lease on the floor level.'}
            {entityType === 'ROOM' && 'Property → [Floor or direct Property] → Room → Direct lease on the room.'}
            {entityType === 'OFFICE' && 'Property → [Floor or direct Property] → Office → Direct lease on the office suite.'}
            {entityType === 'BED' && 'Property → [Floor or Room] → Bed → Individual bed lease (dorm/hostel style supported).'}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || (needsParent && validParents.length === 0)}
          className="mt-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending
            ? 'Creating…'
            : `Create ${RENTABLE_ENTITY_TYPE_LABELS[entityType]}`}
        </button>
      </form>
    </div>
  );
}
