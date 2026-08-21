'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PropertyType, SubPropertyStatus } from '@prisma/client';
import { formatMoney } from '@/lib/tenancy-types';
import { propertyTypeLabel } from '@/lib/property-types';

export type InlineUnit = {
  id: string;
  name: string;
  unitNumber: string;
  status: SubPropertyStatus;
  rentAmount: number;
  monthlyRent: number; // active tenancy rent (for the overdue threshold)
  currentBalance: number; // negative = owed
  floor: string | null;
  tenantName: string | null;
};

// Payment-status border colour → theme-aware CSS variable.
function borderColor(u: InlineUnit): string {
  if (u.status !== 'OCCUPIED') return 'var(--unit-vacant)';
  if (u.currentBalance >= 0) return 'var(--unit-paid)';
  if (u.monthlyRent > 0 && u.currentBalance > -u.monthlyRent) {
    return 'var(--unit-amber)'; // less than 1 month overdue
  }
  return 'var(--unit-red)'; // 1+ months overdue
}

// Current-balance line for a unit card (null for vacant units).
function balanceInfo(u: InlineUnit): { text: string; color: string } | null {
  if (u.status !== 'OCCUPIED') return null;
  const bal = u.currentBalance;
  if (bal > 0) {
    return { text: `↑ ${formatMoney(bal)} credit`, color: 'var(--unit-paid)' };
  }
  if (bal === 0) return { text: '✓ Paid', color: 'var(--unit-paid)' };
  return {
    text: `↓ ${formatMoney(Math.abs(bal))} overdue`,
    color: borderColor(u),
  };
}

type Section = { id: string; label: string; unitIds: string[] };
type DropTarget = { sectionId: string; beforeUnitId: string | null };

// Client-only id (used on user actions, never during initial render → no
// hydration mismatch).
function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'sec-' + Math.random().toString(36).slice(2);
}

// Smart default: one section per unique floor; floorless units under "All Units".
// Deterministic ids so SSR and client hydration match.
function defaultSections(units: InlineUnit[]): Section[] {
  const byFloor = new Map<string, string[]>();
  const floorless: string[] = [];
  for (const u of units) {
    const f = u.floor && u.floor.trim() ? u.floor.trim() : null;
    if (f) (byFloor.get(f) ?? byFloor.set(f, []).get(f)!).push(u.id);
    else floorless.push(u.id);
  }
  const sections: Section[] = [];
  for (const [label, unitIds] of byFloor) sections.push({ id: `f:${label}`, label, unitIds });
  if (floorless.length || sections.length === 0) {
    sections.push({ id: 'all-units', label: 'All Units', unitIds: floorless });
  }
  return sections;
}

// Use a saved layout but drop stale unit ids and append any new units.
function reconcile(saved: Section[], units: InlineUnit[]): Section[] {
  const valid = new Set(units.map((u) => u.id));
  const placed = new Set<string>();
  const result = saved.map((s) => {
    const unitIds = s.unitIds.filter((id) => valid.has(id));
    unitIds.forEach((id) => placed.add(id));
    return { id: s.id, label: s.label, unitIds };
  });
  const leftover = units.filter((u) => !placed.has(u.id)).map((u) => u.id);
  if (leftover.length) {
    if (result.length) result[result.length - 1].unitIds.push(...leftover);
    else result.push({ id: 'all-units', label: 'All Units', unitIds: leftover });
  }
  return result.length ? result : defaultSections(units);
}

export default function PropertyUnitsInline({
  propertyId,
  portfolioId,
  name,
  type,
  occupiedCount,
  unitCount,
  expectedRent,
  units,
  initialExpanded,
  initialSections,
}: {
  propertyId: string;
  portfolioId: string;
  name: string;
  type: PropertyType;
  occupiedCount: number;
  unitCount: number;
  expectedRent: number;
  units: InlineUnit[];
  initialExpanded: boolean;
  initialSections: Section[] | null;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(initialExpanded);
  const [sections, setSections] = useState<Section[]>(() =>
    initialSections && initialSections.length
      ? reconcile(initialSections, units)
      : defaultSections(units),
  );
  const dragRef = useRef<string | null>(null);
  const [dragUnit, setDragUnit] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const unitById = new Map(units.map((u) => [u.id, u]));

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    fetch(`/api/properties/${propertyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitsExpanded: next }),
    })
      .then(() => router.refresh())
      .catch(() => {});
  }

  function moveUnit(unitId: string, sectionId: string, beforeUnitId: string | null) {
    setSections((prev) => {
      const cloned = prev.map((s) => ({ ...s, unitIds: [...s.unitIds] }));
      for (const s of cloned) {
        const i = s.unitIds.indexOf(unitId);
        if (i >= 0) s.unitIds.splice(i, 1);
      }
      const target = cloned.find((s) => s.id === sectionId);
      if (target) {
        const at =
          beforeUnitId != null && target.unitIds.includes(beforeUnitId)
            ? target.unitIds.indexOf(beforeUnitId)
            : target.unitIds.length;
        target.unitIds.splice(at, 0, unitId);
      }
      return cloned;
    });
  }

  function rename(id: string, label: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, label } : s)));
  }
  function addSection() {
    setSections((prev) => [...prev, { id: newId(), label: 'New section', unitIds: [] }]);
  }
  function removeSection(id: string) {
    setSections((prev) =>
      prev.filter((s) => !(s.id === id && s.unitIds.length === 0)),
    );
  }

  async function saveLayout() {
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitSections: sections }),
      });
      if (res.ok) {
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 2000);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  function endDrag() {
    setDropTarget(null);
    setDragUnit(null);
    dragRef.current = null;
  }

  return (
    <div
      className="mt-3 rounded-xl border border-zinc-200 bg-[#0E0C22]"
      data-testid={`prop-inline-${propertyId}`}
      data-expanded={expanded}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        data-testid="prop-inline-toggle"
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-zinc-50"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-white">{name}</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
            {propertyTypeLabel(type)}
          </span>
          <span
            className={
              'text-xs font-medium ' +
              (occupiedCount === unitCount ? 'text-zinc-500' : 'text-[#E8A020]')
            }
          >
            {occupiedCount}/{unitCount} occupied
          </span>
          <span className="text-xs text-[#6A6A8A]">
            · {formatMoney(expectedRent)}/mo expected
          </span>
        </span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
          className={'shrink-0 text-zinc-500 transition-transform ' + (expanded ? 'rotate-180' : '')}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-zinc-200 p-4">
          <p className="mb-3 text-xs text-[#6A6A8A]">
            Drag cards within or between sections, then save your layout.
          </p>

          <div className="space-y-3">
            {sections.map((section) => (
              <div
                key={section.id}
                data-testid="unit-section"
                data-section-id={section.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget({ sectionId: section.id, beforeUnitId: null });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = dragRef.current;
                  if (id) {
                    const t = dropTarget ?? { sectionId: section.id, beforeUnitId: null };
                    moveUnit(id, t.sectionId, t.beforeUnitId);
                  }
                  endDrag();
                }}
                className="rounded-lg border border-[#312D58] bg-[#17152F] p-3"
              >
                {/* Section header: editable label + remove (empty only) */}
                <div className="mb-2 flex items-center justify-between gap-2">
                  {editing === section.id ? (
                    <input
                      autoFocus
                      defaultValue={section.label}
                      data-testid="section-label-input"
                      onBlur={(e) => {
                        rename(section.id, e.target.value.trim() || section.label);
                        setEditing(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      className="rounded-md border border-zinc-700 bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(section.id)}
                      data-testid="section-label"
                      className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-white"
                    >
                      {section.label}
                    </button>
                  )}
                  {section.unitIds.length === 0 && (
                    <button
                      type="button"
                      onClick={() => removeSection(section.id)}
                      data-testid="section-remove"
                      className="text-[11px] font-medium text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {section.unitIds.length === 0 ? (
                  <p className="rounded-md border border-dashed border-[#312D58] py-4 text-center text-xs text-[#6A6A8A]">
                    Drop cards here
                  </p>
                ) : (
                  <div className="flex flex-wrap items-stretch gap-2">
                    {section.unitIds.map((uid, i) => {
                      const u = unitById.get(uid);
                      if (!u) return null;
                      const nextId = section.unitIds[i + 1] ?? null;
                      const showBar =
                        dropTarget?.sectionId === section.id &&
                        dropTarget.beforeUnitId === uid;
                      return (
                        <div key={uid} className="flex items-stretch gap-2">
                          {showBar && (
                            <div className="w-1 shrink-0 self-stretch rounded bg-zinc-900" data-testid="drop-indicator" />
                          )}
                          <UnitCard
                            unit={u}
                            dimmed={dragUnit === uid}
                            onOpen={() =>
                              router.push(
                                `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units/${uid}`,
                              )
                            }
                            onDragStart={() => {
                              dragRef.current = uid;
                              setDragUnit(uid);
                            }}
                            onDragEnd={endDrag}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const r = e.currentTarget.getBoundingClientRect();
                              const before = e.clientX < r.left + r.width / 2;
                              setDropTarget({
                                sectionId: section.id,
                                beforeUnitId: before ? uid : nextId,
                              });
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addSection}
              data-testid="add-section"
              className="rounded-full border border-zinc-200 bg-zinc-900/15 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-900/25"
            >
              + Add section
            </button>
            <button
              type="button"
              onClick={saveLayout}
              disabled={saving}
              data-testid="save-layout"
              className="rounded-full bg-zinc-900 px-4 py-1 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save layout'}
            </button>
            {savedMsg && (
              <span data-testid="layout-saved" className="text-xs font-medium text-emerald-400">
                Layout saved ✓
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UnitCard({
  unit,
  onOpen,
  dimmed,
  onDragStart,
  onDragEnd,
  onDragOver,
}: {
  unit: InlineUnit;
  onOpen: () => void;
  dimmed: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const occupied = unit.status === 'OCCUPIED';
  return (
    <div
      role="link"
      tabIndex={0}
      draggable
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      data-testid="inline-unit-card"
      data-unit-id={unit.id}
      style={{ border: `2px solid ${borderColor(unit)}` }}
      className={
        'flex w-44 cursor-grab flex-col gap-1 rounded-lg bg-[#0E0C22] p-3 ' +
        'transition-colors hover:bg-zinc-50 active:cursor-grabbing ' +
        (dimmed ? 'opacity-40' : '')
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            'h-2 w-2 shrink-0 rounded-full ' +
            (occupied ? 'bg-emerald-400' : 'bg-[#6A6A8A]')
          }
          aria-hidden
        />
        <span className="truncate text-sm font-medium text-white">{unit.name}</span>
      </div>
      <span className="truncate text-xs text-[#B0B0C8]">
        {occupied ? (unit.tenantName ?? 'Occupied') : 'Vacant'}
      </span>
      <span className="text-xs font-medium text-[#E8A020]">
        {formatMoney(unit.rentAmount)}/mo
      </span>
      {(() => {
        const bi = balanceInfo(unit);
        return bi ? (
          <span
            className="text-xs font-medium"
            style={{ color: bi.color }}
            data-testid="unit-balance"
          >
            {bi.text}
          </span>
        ) : null;
      })()}
      <span className="mt-1 text-xs font-medium text-zinc-500">View detail →</span>
    </div>
  );
}
