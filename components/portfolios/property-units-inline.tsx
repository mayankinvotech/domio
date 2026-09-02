'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PropertyType, SubPropertyStatus } from '@prisma/client';
import { formatMoney } from '@/lib/tenancy-types';
import { propertyTypeLabel } from '@/lib/property-types';
import type { OverviewEntityNode } from '@/lib/portfolio-overview';
import AssignTenantModal, { type VacantUnit } from '@/components/portfolios/assign-tenant-modal';
import AddUnitModal from '@/components/portfolios/add-unit-modal';

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

// ── Entity type icons & colour maps ──────────────────────────────────────────

const ENTITY_ICONS: Record<string, string> = {
  PROPERTY: '🏢',
  FLOOR: '🏗️',
  ROOM: '🚪',
  OFFICE: '💼',
  BED: '🛏️',
};

const ENTITY_INDENT_PX = 20; // px per depth level

// Recursive entity tree node renderer
// Leaf nodes (isLeaf=true): show Vacant/Occupied status + Assign Tenant button
// Parent nodes (isLeaf=false): show sub-unit counts + Add Sub-unit button
function EntityTreeNode({
  node,
  depth,
  portfolioId,
  propertyId,
  onAssignTenant,
  onAddSubUnit,
}: {
  node: OverviewEntityNode;
  depth: number;
  portfolioId: string;
  propertyId: string;
  onAssignTenant: (unit: VacantUnit) => void;
  onAddSubUnit: (parentId: string, parentName: string, parentType: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const isLeaf = !hasChildren; // leaf: can be assigned a tenant / shown as Vacant
  const occupied = node.status === 'OCCUPIED';
  const isVacant = !occupied && node.status !== 'MAINTENANCE';

  // Status dot colour — parent containers never show as "vacant" (amber); use neutral zinc
  const dotColor = occupied
    ? 'bg-emerald-500'
    : node.status === 'MAINTENANCE'
    ? 'bg-rose-400'
    : isLeaf
    ? 'bg-amber-400'  // leaf vacant = amber (assignable)
    : 'bg-zinc-300';  // parent structural = neutral gray (not assignable)

  return (
    <div>
      {/* Row */}
      <div
        className={
          'flex items-start gap-2 rounded-xl border transition-all ' +
          (occupied
            ? 'border-emerald-200/70 bg-emerald-50/30'
            : isLeaf
            ? 'border-amber-200/60 bg-amber-50/20 hover:bg-amber-50/40'  // leaf vacant: amber
            : 'border-zinc-200/70 bg-white')  // parent: plain white, no vacant indicator
        }
        style={{ marginLeft: `${depth * ENTITY_INDENT_PX}px` }}
      >
        {/* Left accent bar */}
        <div
          className={
            'w-1 shrink-0 self-stretch rounded-l-xl cursor-pointer ' +
            (occupied ? 'bg-emerald-500' : isLeaf ? 'bg-amber-400' : 'bg-zinc-300')
          }
          onClick={() => hasChildren && setOpen((v) => !v)}
        />

        <div className="flex flex-1 flex-col gap-1 py-2.5 pr-3 min-w-0">
          {/* Top row: expand toggle + icon + name + rent */}
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Expand / collapse arrow — only for parents */}
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] text-zinc-500 hover:bg-zinc-200 transition"
              >
                {open ? '▼' : '▶'}
              </button>
            ) : (
              <span className="w-4 shrink-0 text-center text-[10px] text-zinc-300">•</span>
            )}

            {/* Type icon */}
            <span className="text-base shrink-0" aria-hidden>
              {ENTITY_ICONS[node.type] || '📌'}
            </span>

            {/* Status dot + name */}
            <span className={'h-2 w-2 shrink-0 rounded-full ' + dotColor} aria-hidden />
            <span className="truncate text-sm font-bold text-zinc-900">{node.name}</span>
            <span className="font-mono text-[10px] text-zinc-400 shrink-0">({node.code})</span>

            {/* Effective rent — right-aligned */}
            <span className="ml-auto shrink-0 font-mono text-sm font-bold text-zinc-900">
              {formatMoney(node.effectiveRent)}
            </span>
          </div>

          {/* Second row: status info + action buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pl-9 text-[11px]">
            {/* Occupied: show tenant */}
            {occupied && node.activeLease && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                👤 {node.activeLease.tenantName}
              </span>
            )}

            {/* Parent structural info (NOT vacant, just shows sub-unit summary) */}
            {!isLeaf && (
              <>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-semibold text-zinc-600">
                  {node.children.length} sub-unit{node.children.length !== 1 ? 's' : ''}
                </span>
                {/* Add Sub-unit button (parent nodes only) */}
                <button
                  type="button"
                  onClick={() => onAddSubUnit(node.id, node.name, node.type)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 hover:bg-blue-100 transition text-[10px]"
                >
                  + Add Sub-unit
                </button>
              </>
            )}

            {/* Leaf node: show Vacant + Assign Tenant OR maintenance */}
            {isLeaf && !occupied && node.status !== 'MAINTENANCE' && (
              <>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                  Vacant
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onAssignTenant({
                      id: node.id,
                      name: node.name,
                      unitNumber: node.code,
                      rentAmount: node.listedRent,
                      isRentableEntity: true,
                    })
                  }
                  className="rounded-full border border-emerald-300 bg-emerald-600 px-2.5 py-0.5 font-semibold text-white hover:bg-emerald-700 transition text-[10px]"
                >
                  🔑 Assign Tenant
                </button>
              </>
            )}

            {isLeaf && node.status === 'MAINTENANCE' && (
              <span className="text-zinc-500 font-medium">🔧 Maintenance</span>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div className="mt-1 space-y-1">
          {node.children.map((child) => (
            <EntityTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              portfolioId={portfolioId}
              propertyId={propertyId}
              onAssignTenant={onAssignTenant}
              onAddSubUnit={onAddSubUnit}
            />
          ))}
        </div>
      )}
    </div>
  );
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
  rentableEntities = [],
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
  rentableEntities?: OverviewEntityNode[];
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

  // Modal state
  const [assignModal, setAssignModal] = useState<{
    open: boolean;
    unit: VacantUnit | null;
  }>({ open: false, unit: null });
  const [addUnitModal, setAddUnitModal] = useState<{
    open: boolean;
    parentId?: string;
    parentName?: string;
    parentType?: string;
  }>({ open: false });

  const unitById = new Map(units.map((u) => [u.id, u]));

  // Whether we have a hierarchy to render
  const hasHierarchy = rentableEntities.length > 0;

  function openAssignModal(unit: VacantUnit) {
    setAssignModal({ open: true, unit });
  }
  function openAddUnitModal(parentId?: string) {
    const url = parentId
      ? `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units/new?parentId=${parentId}`
      : `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units/new`;
    router.push(url);
  }

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
      className="mt-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5"
      data-testid={`prop-inline-${propertyId}`}
      data-expanded={expanded}
    >
      {/* Assign Tenant Modal */}
      <AssignTenantModal
        isOpen={assignModal.open}
        onClose={() => setAssignModal({ open: false, unit: null })}
        preselectedUnit={assignModal.unit ?? undefined}
        propertyId={propertyId}
      />
      {/* Add Unit Modal */}
      <AddUnitModal
        isOpen={addUnitModal.open}
        onClose={() => setAddUnitModal({ open: false })}
        propertyId={propertyId}
        parentEntityId={addUnitModal.parentId}
        parentEntityName={addUnitModal.parentName}
        parentEntityType={addUnitModal.parentType}
      />

      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        data-testid="prop-inline-toggle"
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/90 bg-white px-4 py-3 text-left shadow-xs transition-all hover:border-zinc-300 hover:shadow-sm"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-sm font-bold text-zinc-900">{name}</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold text-zinc-700">
            {propertyTypeLabel(type)}
          </span>
          <span
            className={
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
              (occupiedCount === unitCount
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700')
            }
          >
            <span
              className={
                'h-1.5 w-1.5 rounded-full ' +
                (occupiedCount === unitCount ? 'bg-emerald-500' : 'bg-amber-500')
              }
            />
            {occupiedCount}/{unitCount} occupied
          </span>
          <span className="text-xs font-medium text-zinc-500">
            · {formatMoney(expectedRent)}/mo expected
          </span>
          {hasHierarchy && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              🏗️ Hierarchy
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units/new`);
            }}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            + Add Unit
          </button>
          <span className="text-xs font-medium text-zinc-500 hidden sm:inline">
            {expanded ? 'Hide Units' : 'Show Units'}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={
              'shrink-0 text-zinc-500 transition-transform duration-200 ' +
              (expanded ? 'rotate-180 text-zinc-900' : '')
            }
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* ── Hierarchy tree (RentableEntity) ──────────────────────────── */}
          {hasHierarchy && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  🏗️ Rental Hierarchy
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  Prices roll up from lowest unit
                </span>
              </div>
              <div className="space-y-1.5">
                {rentableEntities.map((entity) => (
                  <EntityTreeNode
                    key={entity.id}
                    node={entity}
                    depth={0}
                    portfolioId={portfolioId}
                    propertyId={propertyId}
                    onAssignTenant={openAssignModal}
                    onAddSubUnit={openAddUnitModal}
                  />
                ))}
              </div>

              {/* Show flat units below hierarchy if both exist */}
              {units.length > 0 && (
                <div className="border-t border-zinc-200/60 pt-2">
                  <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Also: Flat Units
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Flat / legacy units (SubProperty drag-and-drop) ──────────── */}
          {units.length > 0 && (
            <>
              {!hasHierarchy && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-zinc-500">
                    Drag unit cards within or between sections to organize, then save your layout.
                  </p>
                </div>
              )}

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
                    className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-xs"
                  >
                    {/* Section header: editable label + remove (empty only) */}
                    <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-zinc-100 pb-2">
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
                          className="rounded-lg border border-zinc-300 bg-zinc-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-zinc-900 outline-none focus:border-zinc-900 focus:bg-white"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing(section.id)}
                          data-testid="section-label"
                          className="group flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:text-zinc-900"
                        >
                          <span>{section.label}</span>
                          <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            ✎
                          </span>
                        </button>
                      )}
                      {section.unitIds.length === 0 && (
                        <button
                          type="button"
                          onClick={() => removeSection(section.id)}
                          data-testid="section-remove"
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Remove Section
                        </button>
                      )}
                    </div>

                    {section.unitIds.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-zinc-200 py-6 text-center text-xs font-medium text-zinc-400">
                        Drop unit cards here
                      </p>
                    ) : (
                      <div className="flex flex-wrap items-stretch gap-2.5">
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
                                <div
                                  className="w-1 shrink-0 self-stretch rounded bg-zinc-900 animate-pulse"
                                  data-testid="drop-indicator"
                                />
                              )}
                              <UnitCard
                                unit={u}
                                dimmed={dragUnit === uid}
                                onOpen={() =>
                                  router.push(
                                    `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units/${uid}`,
                                  )
                                }
                                onAssignTenant={openAssignModal}
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
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={addSection}
                  data-testid="add-section"
                  className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900"
                >
                  + Add section
                </button>
                <button
                  type="button"
                  onClick={saveLayout}
                  disabled={saving}
                  data-testid="save-layout"
                  className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-zinc-800 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save layout'}
                </button>
                {savedMsg && (
                  <span data-testid="layout-saved" className="text-xs font-semibold text-emerald-600 animate-in fade-in">
                    Layout saved ✓
                  </span>
                )}
              </div>
            </>
          )}

          {/* Empty state when no units and no hierarchy */}
          {!hasHierarchy && units.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-white py-8 text-center">
              <p className="text-sm font-medium text-zinc-500">No units added yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UnitCard({
  unit,
  onOpen,
  onAssignTenant,
  dimmed,
  onDragStart,
  onDragEnd,
  onDragOver,
}: {
  unit: InlineUnit;
  onOpen: () => void;
  onAssignTenant?: (unit: VacantUnit) => void;
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
      style={{ borderLeft: `3.5px solid ${borderColor(unit)}` }}
      className={
        'group flex w-48 cursor-grab flex-col gap-1.5 rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-xs ' +
        'transition-all hover:border-zinc-300 hover:shadow-md active:cursor-grabbing ' +
        (dimmed ? 'opacity-40' : '')
      }
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={
              'h-2 w-2 shrink-0 rounded-full ' +
              (occupied ? 'bg-emerald-500' : 'bg-amber-400')
            }
            aria-hidden
          />
          <span className="truncate text-sm font-bold text-zinc-900">{unit.name}</span>
        </div>
        {unit.unitNumber && (
          <span className="font-mono text-[10px] font-semibold text-zinc-400">
            #{unit.unitNumber}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="truncate text-zinc-500 font-medium">
          {occupied ? (unit.tenantName ?? 'Occupied') : 'Vacant'}
        </span>
        <span className="font-mono font-bold text-zinc-900">
          {formatMoney(unit.rentAmount)}
        </span>
      </div>

      {!occupied && onAssignTenant && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAssignTenant({
              id: unit.id,
              name: unit.name,
              unitNumber: unit.unitNumber,
              rentAmount: unit.rentAmount,
              isRentableEntity: false,
            });
          }}
          className="mt-1 w-full rounded-lg border border-emerald-300 bg-emerald-600 py-1 text-center text-[11px] font-bold text-white transition hover:bg-emerald-700"
        >
          🔑 Assign Tenant
        </button>
      )}

      {(() => {
        const bi = balanceInfo(unit);
        return bi ? (
          <div className="mt-0.5">
            <span
              className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: bi.color, backgroundColor: `${bi.color}15` }}
              data-testid="unit-balance"
            >
              {bi.text}
            </span>
          </div>
        ) : null;
      })()}

      <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-900 transition-colors pt-1 border-t border-zinc-100">
        <span>View Details</span>
        <span>→</span>
      </div>
    </div>
  );
}
