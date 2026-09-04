'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { RentableEntityNode } from '@/lib/rentable-entities';
import { RENTABLE_ENTITY_TYPE_LABELS } from '@/lib/rentable-entities';
import {
  formatRent,
  subPropertyStatusBadgeClass,
  subPropertyStatusLabel,
} from '@/lib/sub-property-types';
import NotesIcon from '@/components/ui/notes-icon';
import type { VacantUnit } from '@/components/portfolios/assign-tenant-modal';

const TYPE_ICONS: Record<string, string> = {
  PROPERTY: '🏢',
  FLOOR: '🏗️',
  ROOM: '🚪',
  OFFICE: '💼',
  BED: '🛏️',
};

const TYPE_BADGES: Record<string, string> = {
  PROPERTY: 'border-purple-200 bg-purple-50 text-purple-700 font-semibold',
  FLOOR: 'border-blue-200 bg-blue-50 text-blue-700 font-semibold',
  ROOM: 'border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold',
  OFFICE: 'border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold',
  BED: 'border-amber-200 bg-amber-50 text-amber-800 font-semibold',
};

type DirectFilter = 'ALL' | 'HAS_DIRECT' | 'ZERO' | 'SORT_HIGH' | 'SORT_LOW';
type RentFilter = 'ALL' | 'HAS_RENT' | 'ZERO_RENT' | 'HIGH' | 'LOW' | 'SORT_HIGH' | 'SORT_LOW';
type CollectedFilter = 'ALL' | 'PAID' | 'DUE' | 'ZERO_COLL' | 'SORT_HIGH' | 'SORT_LOW';
type StatusFilter = 'ALL' | 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';
type SubUnitFilter = 'ALL' | 'CAN_ADD' | 'CANNOT_ADD';

export type HierarchyRow = {
  id: string;
  propertyId: string;
  name: string;
  code: string;
  type: string;
  depth: number;
  rentAmount: number; // Direct rent
  aggregatedRent: number; // Rollup rent (renamed to Rent)
  aggregatedCollection: number; // Collected
  status: string;
  notes?: string | null;
  activeLease?: {
    tenantName: string;
    monthlyRent: number;
  } | null;
  hasChildren: boolean;
  isLeaf: boolean;
  children: HierarchyRow[];
};

export default function RentableEntityTreeView({
  entities,
  portfolioId,
  propertyId,
  onAssignTenant,
}: {
  entities: RentableEntityNode[];
  portfolioId?: string;
  propertyId?: string;
  onAssignTenant?: (unit: VacantUnit) => void;
}) {
  const params = useParams();
  const pId = portfolioId || (params?.portfolioId as string) || '';
  const propId = propertyId || (params?.propertyId as string) || '';

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Column filters state
  const [unitSearch, setUnitSearch] = useState('');
  const [directFilter, setDirectFilter] = useState<DirectFilter>('ALL');
  const [rentFilter, setRentFilter] = useState<RentFilter>('ALL');
  const [collectedFilter, setCollectedFilter] = useState<CollectedFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [subUnitFilter, setSubUnitFilter] = useState<SubUnitFilter>('ALL');

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Beds are terminal — cannot have sub-units
  function canAddSubUnit(row: HierarchyRow): boolean {
    return row.type !== 'BED';
  }

  // ── Convert RentableEntityNode tree into HierarchyRow tree ────────────────
  const treeData = useMemo<HierarchyRow[]>(() => {
    function mapNode(node: RentableEntityNode, depth: number): HierarchyRow {
      const kids = (node.children || []).map((c) => mapNode(c, depth + 1));
      return {
        id: node.id,
        propertyId: node.propertyId || propId,
        name: node.name,
        code: node.code,
        type: node.type,
        depth,
        rentAmount: node.rentAmount ?? 0,
        aggregatedRent: node.aggregatedRent ?? node.rentAmount ?? 0,
        aggregatedCollection: node.aggregatedCollection ?? 0,
        status: node.status,
        notes: node.notes,
        activeLease: node.activeLease,
        hasChildren: kids.length > 0,
        isLeaf: kids.length === 0,
        children: kids,
      };
    }
    return (entities || []).map((e) => mapNode(e, 0));
  }, [entities, propId]);

  // ── Active filter detection ───────────────────────────────────────────────
  const hasActiveFilters =
    unitSearch.trim() !== '' ||
    directFilter !== 'ALL' ||
    rentFilter !== 'ALL' ||
    collectedFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    subUnitFilter !== 'ALL';

  function resetFilters() {
    setUnitSearch('');
    setDirectFilter('ALL');
    setRentFilter('ALL');
    setCollectedFilter('ALL');
    setStatusFilter('ALL');
    setSubUnitFilter('ALL');
  }

  // ── Per-node filter predicate ─────────────────────────────────────────────
  function nodeMatches(node: HierarchyRow): boolean {
    if (unitSearch.trim()) {
      const q = unitSearch.trim().toLowerCase();
      if (
        !node.name.toLowerCase().includes(q) &&
        !(node.code?.toLowerCase().includes(q) ?? false) &&
        !(node.activeLease?.tenantName.toLowerCase().includes(q) ?? false)
      ) {
        return false;
      }
    }
    if (directFilter === 'HAS_DIRECT' && node.rentAmount <= 0) return false;
    if (directFilter === 'ZERO' && node.rentAmount > 0) return false;

    if (rentFilter === 'HAS_RENT' && node.aggregatedRent <= 0) return false;
    if (rentFilter === 'ZERO_RENT' && node.aggregatedRent > 0) return false;
    if (rentFilter === 'HIGH' && node.aggregatedRent < 10000) return false;
    if (rentFilter === 'LOW' && node.aggregatedRent >= 10000) return false;

    if (collectedFilter === 'PAID' && node.aggregatedCollection <= 0) return false;
    if (collectedFilter === 'DUE' && node.aggregatedCollection >= node.aggregatedRent) return false;
    if (collectedFilter === 'ZERO_COLL' && node.aggregatedCollection > 0) return false;

    if (statusFilter !== 'ALL' && node.isLeaf) {
      if (node.status !== statusFilter) return false;
    }

    if (subUnitFilter === 'CAN_ADD' && !canAddSubUnit(node)) return false;
    if (subUnitFilter === 'CANNOT_ADD' && canAddSubUnit(node)) return false;

    return true;
  }

  // ── Filter hierarchy tree ─────────────────────────────────────────────────
  const filteredTrees = useMemo<HierarchyRow[]>(() => {
    if (!hasActiveFilters) return treeData;

    function filterBranch(node: HierarchyRow): HierarchyRow | null {
      const filteredKids = node.children
        .map(filterBranch)
        .filter((c): c is HierarchyRow => c !== null);

      const isSelfMatch = nodeMatches(node);
      if (isSelfMatch || filteredKids.length > 0) {
        return {
          ...node,
          hasChildren: filteredKids.length > 0,
          children: filteredKids,
        };
      }
      return null;
    }

    return treeData
      .map(filterBranch)
      .filter((n): n is HierarchyRow => n !== null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeData, hasActiveFilters, unitSearch, directFilter, rentFilter, collectedFilter, statusFilter, subUnitFilter]);

  // ── Flatten tree to rows respecting collapse state and sorting ────────────
  const visibleRows = useMemo<HierarchyRow[]>(() => {
    const rows: HierarchyRow[] = [];
    function traverse(node: HierarchyRow) {
      rows.push(node);
      if (!collapsed.has(node.id) && node.children.length > 0) {
        node.children.forEach(traverse);
      }
    }
    filteredTrees.forEach(traverse);

    // Flat sort when requested
    if (directFilter === 'SORT_HIGH') return [...rows].sort((a, b) => b.rentAmount - a.rentAmount);
    if (directFilter === 'SORT_LOW') return [...rows].sort((a, b) => a.rentAmount - b.rentAmount);
    if (rentFilter === 'SORT_HIGH') return [...rows].sort((a, b) => b.aggregatedRent - a.aggregatedRent);
    if (rentFilter === 'SORT_LOW') return [...rows].sort((a, b) => a.aggregatedRent - b.aggregatedRent);
    if (collectedFilter === 'SORT_HIGH') return [...rows].sort((a, b) => b.aggregatedCollection - a.aggregatedCollection);
    if (collectedFilter === 'SORT_LOW') return [...rows].sort((a, b) => a.aggregatedCollection - b.aggregatedCollection);

    return rows;
  }, [filteredTrees, collapsed, directFilter, rentFilter, collectedFilter]);

  if (!entities || entities.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-xs">
        <p className="text-sm font-semibold text-zinc-700">No hierarchical rental entities configured yet for this property.</p>
        <p className="mt-1 text-xs text-zinc-500">
          Use &quot;Add Entity / Unit&quot; to define floors, rooms, beds, or whole-building levels.
        </p>
      </div>
    );
  }

  const selectCls =
    'w-full rounded-lg border border-zinc-200 bg-zinc-50/90 px-2 py-1 text-xs text-zinc-700 outline-none transition focus:border-zinc-900 focus:bg-white cursor-pointer';

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden">
      {/* Subheader Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/70">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
            Property Rental Hierarchy
          </h3>
          <p className="text-[11px] font-medium text-zinc-500">
            Rent rolls up from beds to rooms, floors, and property
          </p>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">
              Showing {visibleRows.length} {visibleRows.length === 1 ? 'row' : 'rows'}
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Scrollable table container — thead is sticky inside this container */}
      <div className="relative overflow-auto" style={{ maxHeight: '580px' }}>
        <table className="w-full min-w-[960px] text-left border-collapse text-sm">
          {/* ── Sticky thead: Row 1 = Headers, Row 2 = Column Filters ──────── */}
          <thead className="sticky top-0 z-20 bg-white">
            {/* Row 1 — Column Labels */}
            <tr className="bg-zinc-50/95 text-xs font-bold uppercase tracking-wider text-zinc-600 border-b border-zinc-200 shadow-2xs">
              <th className="px-5 py-3 min-w-[280px]">Unit</th>
              <th className="px-4 py-3 text-right min-w-[120px]">Direct</th>
              <th className="px-4 py-3 text-right min-w-[130px]">Rent</th>
              <th className="px-4 py-3 text-right min-w-[120px]">Collected</th>
              <th className="px-4 py-3 text-center min-w-[150px]">Status</th>
              <th className="px-4 py-3 text-center min-w-[130px]">Add Sub Unit</th>
              <th className="px-4 py-3 text-right min-w-[130px]">Actions</th>
            </tr>

            {/* Row 2 — Column Filters */}
            <tr className="bg-white border-b border-zinc-200/90 text-xs">
              {/* 1. Unit search */}
              <th className="px-5 py-2 font-normal">
                <div className="relative">
                  <svg
                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    placeholder="Search unit or code…"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/90 py-1 pl-7 pr-6 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-zinc-900 focus:bg-white"
                  />
                  {unitSearch && (
                    <button
                      type="button"
                      onClick={() => setUnitSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700"
                      aria-label="Clear"
                    >
                      ×
                    </button>
                  )}
                </div>
              </th>

              {/* 2. Direct filter */}
              <th className="px-4 py-2 font-normal text-right">
                <select
                  value={directFilter}
                  onChange={(e) => setDirectFilter(e.target.value as DirectFilter)}
                  className={selectCls}
                  aria-label="Filter Direct"
                >
                  <option value="ALL">All</option>
                  <option value="HAS_DIRECT">{'> ₹0'}</option>
                  <option value="ZERO">₹0 or —</option>
                  <option value="SORT_HIGH">Highest → Lowest</option>
                  <option value="SORT_LOW">Lowest → Highest</option>
                </select>
              </th>

              {/* 3. Rent filter (Rollup renamed to Rent) */}
              <th className="px-4 py-2 font-normal text-right">
                <select
                  value={rentFilter}
                  onChange={(e) => setRentFilter(e.target.value as RentFilter)}
                  className={selectCls}
                  aria-label="Filter Rent"
                >
                  <option value="ALL">All</option>
                  <option value="HAS_RENT">{'> ₹0'}</option>
                  <option value="ZERO_RENT">₹0</option>
                  <option value="HIGH">≥ ₹10,000</option>
                  <option value="LOW">{'< ₹10,000'}</option>
                  <option value="SORT_HIGH">Highest → Lowest</option>
                  <option value="SORT_LOW">Lowest → Highest</option>
                </select>
              </th>

              {/* 4. Collected filter */}
              <th className="px-4 py-2 font-normal text-right">
                <select
                  value={collectedFilter}
                  onChange={(e) => setCollectedFilter(e.target.value as CollectedFilter)}
                  className={selectCls}
                  aria-label="Filter Collected"
                >
                  <option value="ALL">All</option>
                  <option value="PAID">Paid ({'> ₹0'})</option>
                  <option value="DUE">Due (partial)</option>
                  <option value="ZERO_COLL">₹0 only</option>
                  <option value="SORT_HIGH">Highest → Lowest</option>
                  <option value="SORT_LOW">Lowest → Highest</option>
                </select>
              </th>

              {/* 5. Status filter */}
              <th className="px-4 py-2 font-normal text-center">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className={selectCls}
                  aria-label="Filter Status"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="VACANT">Vacant</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </th>

              {/* 6. Sub-unit filter */}
              <th className="px-4 py-2 font-normal text-center">
                <select
                  value={subUnitFilter}
                  onChange={(e) => setSubUnitFilter(e.target.value as SubUnitFilter)}
                  className={selectCls}
                  aria-label="Filter Sub Unit"
                >
                  <option value="ALL">All</option>
                  <option value="CAN_ADD">Can Add</option>
                  <option value="CANNOT_ADD">Cannot Add (Beds)</option>
                </select>
              </th>

              {/* 7. Reset */}
              <th className="px-4 py-2 font-normal text-right">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100"
                  >
                    Reset
                  </button>
                )}
              </th>
            </tr>
          </thead>

          {/* ── Table Body ────────────────────────────────────────────────── */}
          <tbody className="divide-y divide-zinc-100 bg-white">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-400">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                    <span className="text-xs font-medium">No rental entities match your filter criteria.</span>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-[11px] font-bold text-rose-500 hover:underline"
                    >
                      Reset filters
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const isCollapsedRow = collapsed.has(row.id);
                const isOccupied = row.status === 'OCCUPIED' || !!row.activeLease;
                const allowSubUnit = canAddSubUnit(row);
                const effectivePropId = propId || row.propertyId;

                const subUnitHref = pId && effectivePropId
                  ? `/dashboard/portfolios/${pId}/properties/${effectivePropId}/units/new?parentId=${row.id}`
                  : '#';

                return (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-zinc-50/70 ${
                      row.type === 'PROPERTY' ? 'bg-zinc-50/40 font-semibold' : ''
                    }`}
                  >
                    {/* 1. Unit column with tree indentation */}
                    <td className="px-5 py-3">
                      <div className="relative flex items-center min-w-0">
                        {/* Tree depth indentation */}
                        {row.depth > 0 && (
                          <div
                            className="flex items-center shrink-0"
                            style={{ width: `${row.depth * 24}px` }}
                          >
                            {Array.from({ length: row.depth }).map((_, i) => (
                              <div
                                key={i}
                                className="relative h-9 shrink-0 w-6 flex items-center justify-center"
                              >
                                <div className="absolute top-0 bottom-0 left-3 w-px bg-zinc-200" />
                                {i === row.depth - 1 && (
                                  <div className="absolute top-1/2 left-3 w-3 h-px bg-zinc-200" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Expand / collapse button */}
                        {row.hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleCollapse(row.id)}
                            className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-zinc-300 bg-white text-[11px] font-bold text-zinc-600 shadow-2xs transition hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer"
                            title={isCollapsedRow ? 'Expand' : 'Collapse'}
                          >
                            {isCollapsedRow ? '+' : '−'}
                          </button>
                        ) : (
                          <span className="mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-[9px] text-zinc-400">
                            ▫
                          </span>
                        )}

                        {/* Type Icon */}
                        <span className="mr-1.5 shrink-0 text-base select-none">
                          {TYPE_ICONS[row.type] || '🏢'}
                        </span>

                        {/* Type badge */}
                        <span
                          className={
                            'mr-2 inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] ' +
                            (TYPE_BADGES[row.type] || 'border-zinc-200 bg-zinc-50 text-zinc-700')
                          }
                        >
                          {RENTABLE_ENTITY_TYPE_LABELS[row.type as keyof typeof RENTABLE_ENTITY_TYPE_LABELS] || row.type}
                        </span>

                        {/* Unit name & code */}
                        <div className="flex flex-wrap items-baseline gap-1.5 min-w-0 truncate">
                          <span
                            className={
                              row.type === 'PROPERTY'
                                ? 'font-extrabold text-zinc-950 text-sm'
                                : 'font-bold text-zinc-900 text-sm'
                            }
                          >
                            {row.name}
                          </span>
                          {row.code && (
                            <span className="font-mono text-[11px] text-zinc-400">
                              ({row.code})
                            </span>
                          )}
                          <NotesIcon notes={row.notes} />
                        </div>
                      </div>
                    </td>

                    {/* 2. Direct rent */}
                    <td className="px-4 py-3 text-right font-mono text-sm text-zinc-600">
                      {row.rentAmount > 0 ? (
                        formatRent(row.rentAmount)
                      ) : row.type === 'PROPERTY' ? (
                        formatRent(0)
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>

                    {/* 3. Rent (Rollup renamed to Rent) */}
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold text-zinc-900">
                      {row.aggregatedRent > 0 ? (
                        formatRent(row.aggregatedRent)
                      ) : (
                        <span className="text-zinc-400 font-normal">—</span>
                      )}
                    </td>

                    {/* 4. Collected */}
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {row.aggregatedCollection > 0 ? (
                        <span className="font-bold text-emerald-700">
                          {formatRent(row.aggregatedCollection)}
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-mono">{formatRent(0)}</span>
                      )}
                    </td>

                    {/* 5. Status */}
                    <td className="px-4 py-3 text-center">
                      {row.isLeaf ? (
                        isOccupied ? (
                          <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs whitespace-nowrap">
                            {row.activeLease?.tenantName ? (
                              <>
                                <span>👤</span>
                                <span>{row.activeLease.tenantName} · occupied</span>
                              </>
                            ) : (
                              'Occupied'
                            )}
                          </span>
                        ) : row.status === 'MAINTENANCE' ? (
                          <span className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 whitespace-nowrap">
                            Maintenance
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-2xs whitespace-nowrap">
                            Vacant
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600 whitespace-nowrap">
                          {row.children.length} sub-unit{row.children.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </td>

                    {/* 6. Add Sub Unit (Beds disabled, others clickable) */}
                    <td className="px-4 py-3 text-center">
                      {allowSubUnit && pId && effectivePropId ? (
                        <Link
                          href={subUnitHref}
                          className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 hover:text-indigo-900 active:scale-95 whitespace-nowrap"
                          title={`Add sub-unit under ${row.name}`}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                          </svg>
                          <span>+ Sub Unit</span>
                        </Link>
                      ) : (
                        <span
                          className="inline-flex items-center rounded-xl border border-zinc-200 bg-zinc-50/80 px-2.5 py-1 text-[11px] font-medium text-zinc-400 cursor-not-allowed select-none whitespace-nowrap"
                          title={row.type === 'BED' ? 'Beds cannot have sub-units' : undefined}
                        >
                          {row.type === 'BED' ? '🛏 Bed' : '—'}
                        </span>
                      )}
                    </td>

                    {/* 7. Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {row.isLeaf && !isOccupied && row.status !== 'MAINTENANCE' && onAssignTenant && (
                          <button
                            type="button"
                            onClick={() =>
                              onAssignTenant({
                                id: row.id,
                                name: row.name,
                                unitNumber: row.code,
                                rentAmount: row.rentAmount || row.aggregatedRent,
                                isRentableEntity: true,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 whitespace-nowrap"
                          >
                            🔑 Assign Tenant
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}