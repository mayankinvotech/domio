'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { RentableEntityType, SubPropertyStatus } from '@prisma/client';
import { SUB_PROPERTY_STATUSES } from '@/lib/sub-property-types';
import {
  RENTABLE_ENTITY_TYPE_LABELS,
  VALID_PARENT_TYPES,
  type RentableEntityNode,
} from '@/lib/rentable-entities';

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-[#5B4FE8] focus:ring-2 focus:ring-[#5B4FE8]/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

const ENTITY_TYPES: { value: RentableEntityType; label: string; description: string; icon: string }[] = [
  { value: 'PROPERTY', label: 'Whole Property', description: 'Lease the entire building', icon: '🏢' },
  { value: 'FLOOR', label: 'Floor', description: 'A single floor / level', icon: '🏗️' },
  { value: 'ROOM', label: 'Room', description: 'A room within a floor', icon: '🚪' },
  { value: 'BED', label: 'Bed', description: 'A bed in a shared room', icon: '🛏️' },
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
  propertyId,
  listHref,
}: {
  propertyId: string;
  listHref: string;
}) {
  const router = useRouter();
  const [entityType, setEntityType] = useState<RentableEntityType>('FLOOR');
  const [parentId, setParentId] = useState<string>('');
  const [existingEntities, setExistingEntities] = useState<RentableEntityNode[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Load existing entities for the parent picker
  useEffect(() => {
    setLoadingEntities(true);
    fetch(`/api/rentable-entities?propertyId=${propertyId}`)
      .then((r) => r.json())
      .then((d) => {
        setExistingEntities(d.entities ?? []);
        setLoadingEntities(false);
      })
      .catch(() => setLoadingEntities(false));
  }, [propertyId]);

  // Reset parentId when entity type changes (incompatible parent becomes invalid)
  useEffect(() => {
    setParentId('');
  }, [entityType]);

  const needsParent = VALID_PARENT_TYPES[entityType].length > 0;
  const validParents = flattenTree(existingEntities).filter((e) =>
    VALID_PARENT_TYPES[entityType].includes(e.type),
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(e.currentTarget);
    const payload = {
      propertyId,
      type: entityType,
      name: data.get('name'),
      code: data.get('code'),
      parentId: parentId || null,
      areaSqft: data.get('areaSqft') || null,
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

  return (
    <div>
      {/* Entity Type Selector */}
      <div className="mb-6">
        <p className={labelClass + ' mb-3'}>What are you renting out?</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ENTITY_TYPES.map((et) => (
            <button
              key={et.value}
              type="button"
              onClick={() => setEntityType(et.value)}
              className={
                'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ' +
                (entityType === et.value
                  ? 'border-[#5B4FE8] bg-[#5B4FE8]/15 text-white shadow-[0_0_16px_rgba(91,79,232,0.25)]'
                  : 'border-[#312D58] bg-[rgba(255,255,255,0.04)] text-[#B0B0C8] hover:border-[#5B4FE8]/50 hover:text-white')
              }
            >
              <span className="text-2xl">{et.icon}</span>
              <span className="text-xs font-semibold">{et.label}</span>
              <span className="text-[10px] leading-tight text-[#6A6A8A]">{et.description}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* Parent entity picker (shown when the selected type requires a parent) */}
        {needsParent && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="parentId" className={labelClass}>
              Parent Entity{' '}
              <span className="text-[#B0B0C8]">
                (must be: {VALID_PARENT_TYPES[entityType].join(' or ')})
              </span>
            </label>
            {loadingEntities ? (
              <p className="text-sm text-[#6A6A8A]">Loading entities…</p>
            ) : validParents.length === 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
                No compatible parent entities found. Create a{' '}
                {VALID_PARENT_TYPES[entityType].join(' or ')} first, then add a {entityType.toLowerCase()} inside it.
              </div>
            ) : (
              <select
                id="parentId"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                required
                className={inputClass}
              >
                <option value="">— Select parent entity —</option>
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
              placeholder={`e.g. "${entityType === 'FLOOR' ? 'Ground Floor' : entityType === 'ROOM' ? 'Room 3A' : entityType === 'BED' ? 'Bed B' : 'Main Building'}"`}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className={labelClass}>
              Short Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              placeholder={`e.g. "${entityType === 'FLOOR' ? 'GF' : entityType === 'ROOM' ? 'R3A' : entityType === 'BED' ? 'BD-B' : 'MAIN'}"`}
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
            <input
              id="rentAmount"
              name="rentAmount"
              type="number"
              min="0"
              step="any"
              required
              placeholder="0"
              className={inputClass}
            />
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
            Notes <span className="text-[#B0B0C8]">(optional)</span>
          </label>
          <textarea
            id="entityNotes"
            name="notes"
            rows={3}
            placeholder="Any additional details about this entity…"
            className={inputClass + ' resize-y'}
          />
        </div>

        {/* Hierarchy preview */}
        <div className="rounded-xl border border-[#312D58] bg-[rgba(255,255,255,0.03)] px-4 py-3">
          <p className="text-xs font-medium text-[#6A6A8A] uppercase tracking-wide mb-1">
            How this will be structured
          </p>
          <p className="text-sm text-[#B0B0C8]">
            {entityType === 'PROPERTY' && 'Property (whole building) → lease attached to the building'}
            {entityType === 'FLOOR' && 'Property → Floor → lease attached to the floor'}
            {entityType === 'ROOM' && 'Property → Floor → Room → lease attached to the room'}
            {entityType === 'BED' && 'Property → Floor → Room → Bed → lease attached to the bed'}
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || (needsParent && validParents.length === 0)}
          className="mt-2 rounded-full bg-gradient-to-r from-[#5B4FE8] to-[#8B6FE8] px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(91,79,232,0.3)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending
            ? 'Creating…'
            : `Create ${RENTABLE_ENTITY_TYPE_LABELS[entityType]}`}
        </button>
      </form>
    </div>
  );
}
