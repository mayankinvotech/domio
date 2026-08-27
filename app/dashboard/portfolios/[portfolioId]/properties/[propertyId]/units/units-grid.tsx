'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { SubPropertyListItem } from '@/lib/sub-properties';
import type { RentableEntityNode } from '@/lib/rentable-entities';
import type { SubPropertyStatus } from '@prisma/client';
import {
  subPropertyStatusBadgeClass,
  subPropertyStatusLabel,
  formatRent,
  formatArea,
} from '@/lib/sub-property-types';
import ViewToggle, { type View } from '@/components/ui/view-toggle';
import NotesIcon from '@/components/ui/notes-icon';
import UnitUtilities from '@/components/utilities/unit-utilities';
import RentableEntityTreeView from './rentable-entity-tree-view';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { ButtonLink } from '@/components/ui/button';

const STORAGE_KEY = 'domio-units-view';

type StatusFilter = 'ALL' | SubPropertyStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'OCCUPIED', label: 'Occupied' },
  { value: 'VACANT', label: 'Vacant' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

const ghostBtn =
  'inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-xs transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900';
const primaryBtn =
  'inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-1 text-xs font-semibold text-white shadow-xs transition-all hover:bg-zinc-800';
const dangerBtn =
  'inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/60 px-3 py-1 text-xs font-semibold text-rose-600 shadow-xs transition-all hover:bg-rose-100 hover:border-rose-300';

export default function UnitsGrid({
  portfolioId,
  propertyId,
  propertyName,
  units,
  rentableEntities = [],
}: {
  portfolioId: string;
  propertyId: string;
  propertyName: string;
  units: SubPropertyListItem[];
  rentableEntities?: RentableEntityNode[];
}) {
  const [items, setItems] = useState(units);
  const [target, setTarget] = useState<SubPropertyListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('card');
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [displayTab, setDisplayTab] = useState<'blocks' | 'hierarchy'>('blocks');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(units);
  }, [units]);

  useScrollLock(!!target);
  const trapRef = useFocusTrap<HTMLDivElement>(!!target);
  useEffect(() => {
    if (!target) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [target, deleting]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'card' || saved === 'table') setView(saved);
    setMounted(true);
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage failures */
    }
  }

  function closeConfirm() {
    if (deleting) return;
    setTarget(null);
    setError(null);
  }

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/sub-properties/${target.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== target.id));
      setTarget(null);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setDeleting(false);
  }

  // Stats calculation
  const stats = useMemo(() => {
    const totalUnits = items.length;
    const occupiedCount = items.filter((u) => u.status === 'OCCUPIED').length;
    const vacantCount = items.filter((u) => u.status === 'VACANT').length;
    const maintenanceCount = items.filter((u) => u.status === 'MAINTENANCE').length;
    const totalRent = items.reduce((acc, u) => acc + (u.rentAmount || 0), 0);
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;

    return {
      totalUnits,
      occupiedCount,
      vacantCount,
      maintenanceCount,
      totalRent,
      occupancyRate,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((u) => {
      if (filter !== 'ALL' && u.status !== filter) return false;
      if (!q) return true;
      if (u.name.toLowerCase().includes(q)) return true;
      if (u.unitNumber.toLowerCase().includes(q)) return true;
      if (u.floor?.toLowerCase().includes(q)) return true;
      if (u.currentTenantName?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [items, filter, search]);

  const base = `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units`;

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-base">
              🏠
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
              {propertyName}
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Manage unit blocks, floors, rental entities, and tenancy assignments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ButtonLink
            href={`${base}/new`}
            variant="primary"
            size="md"
            className="font-semibold shadow-sm"
          >
            + Add Entity / Unit
          </ButtonLink>
        </div>
      </div>

      {/* 2. Key Metrics Snapshot Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Units */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Units
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-zinc-900">
            {stats.totalUnits}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Total rentable spaces</p>
        </div>

        {/* Occupancy */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Occupancy
            </p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              {stats.occupancyRate}%
            </span>
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-zinc-900">
            {stats.occupiedCount}/{stats.totalUnits}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(stats.occupancyRate, 100)}%` }}
            />
          </div>
        </div>

        {/* Monthly Expected Rent */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Expected Rent
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-600">
            {formatRent(stats.totalRent)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">Monthly potential</p>
        </div>

        {/* Vacancy & Maintenance */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Available Spaces
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-amber-600">
            {stats.vacantCount}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {stats.maintenanceCount > 0 ? `${stats.maintenanceCount} in maintenance` : 'Ready to lease'}
          </p>
        </div>
      </div>

      {/* 3. View mode & Hierarchy tab switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDisplayTab('blocks')}
            className={
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ' +
              (displayTab === 'blocks'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900')
            }
          >
            Unit Blocks ({items.length})
          </button>
          {rentableEntities.length > 0 && (
            <button
              type="button"
              onClick={() => setDisplayTab('hierarchy')}
              className={
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ' +
                (displayTab === 'hierarchy'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900')
              }
            >
              Hierarchy Tree ({rentableEntities.length})
            </button>
          )}
        </div>

        {displayTab === 'blocks' && (
          <div className="flex items-center gap-2">
            <ViewToggle view={view} onChange={changeView} />
          </div>
        )}
      </div>

      {displayTab === 'hierarchy' ? (
        <div className="mt-4">
          <RentableEntityTreeView entities={rentableEntities} />
        </div>
      ) : (
        <>
          {/* 4. Filters & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_FILTERS.map((f) => {
                const isSelected = filter === f.value;
                const count =
                  f.value === 'ALL'
                    ? items.length
                    : items.filter((u) => u.status === f.value).length;

                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilter(f.value)}
                    className={
                      'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ' +
                      (isSelected
                        ? 'bg-zinc-900 text-white shadow-xs'
                        : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900')
                    }
                  >
                    <span>{f.label}</span>
                    <span
                      className={
                        'rounded-full px-1.5 py-0.2 text-[10px] font-bold ' +
                        (isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-zinc-100 text-zinc-500')
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search input */}
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search units or tenants..."
                className="w-full rounded-full border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-xs text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* 5. Units Cards / Table */}
          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center shadow-xs">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-3xl">
                🚪
              </div>
              <h2 className="mt-4 text-lg font-bold tracking-tight text-zinc-900">
                No units created yet
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Add floors, rooms, or individual units to start managing tenancies.
              </p>
              <ButtonLink
                href={`${base}/new`}
                variant="primary"
                size="md"
                className="mt-5 font-semibold"
              >
                + Add Entity / Unit
              </ButtonLink>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs">
              <p className="text-sm font-medium text-zinc-500">
                No units match your current search or filter criteria.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilter('ALL');
                  setSearch('');
                }}
                className="mt-3 text-xs font-bold text-zinc-900 hover:underline"
              >
                Reset Filters
              </button>
            </div>
          ) : view === 'card' ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((u) => {
                const isOccupied = u.status === 'OCCUPIED';
                const statusBorder =
                  u.status === 'OCCUPIED'
                    ? '#10b981'
                    : u.status === 'MAINTENANCE'
                    ? '#f59e0b'
                    : '#a1a1aa';

                return (
                  <div
                    key={u.id}
                    style={{ borderLeft: `4px solid ${statusBorder}` }}
                    className="flex flex-col rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              'h-2 w-2 shrink-0 rounded-full ' +
                              (isOccupied
                                ? 'bg-emerald-500'
                                : u.status === 'MAINTENANCE'
                                ? 'bg-amber-500'
                                : 'bg-zinc-400')
                            }
                            aria-hidden
                          />
                          <h3 className="truncate font-bold text-zinc-900">
                            {u.name}
                          </h3>
                          <NotesIcon notes={u.notes} />
                        </div>
                        <p className="mt-0.5 font-mono text-xs font-medium text-zinc-400">
                          Unit #{u.unitNumber}
                        </p>
                      </div>

                      <span
                        className={
                          'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                          subPropertyStatusBadgeClass(u.status)
                        }
                      >
                        {subPropertyStatusLabel(u.status)}
                      </span>
                    </div>

                    <dl className="mt-4 flex-1 space-y-2 border-t border-zinc-100 pt-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-zinc-500">Floor</dt>
                        <dd className="font-medium text-zinc-800">{u.floor || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-zinc-500">Area</dt>
                        <dd className="font-medium text-zinc-800">{formatArea(u.areaSqft)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-zinc-500">Rent</dt>
                        <dd className="font-mono font-bold text-zinc-900">
                          {formatRent(u.rentAmount)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-zinc-500">Tenant</dt>
                        <dd className="truncate font-medium text-zinc-900">
                          {u.currentTenantName ? `👤 ${u.currentTenantName}` : '—'}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3">
                      <Link href={`${base}/${u.id}`} className={ghostBtn}>
                        View Detail →
                      </Link>
                      {u.status === 'VACANT' && (
                        <Link
                          href="/dashboard/tenants"
                          className={primaryBtn}
                        >
                          Assign Tenant
                        </Link>
                      )}
                      <Link
                        href={`${base}/${u.id}/edit`}
                        className={ghostBtn}
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setTarget(u);
                        }}
                        className={dangerBtn}
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-3 border-t border-zinc-100 pt-3">
                      <UnitUtilities subPropertyId={u.id} propertyId={propertyId} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-xs">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
                  <tr>
                    <th className="px-5 py-3.5">Unit Number</th>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Floor</th>
                    <th className="px-5 py-3.5">Area</th>
                    <th className="px-5 py-3.5">Rent</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Tenant</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((u) => (
                    <tr
                      key={u.id}
                      className="transition-colors hover:bg-zinc-50/70"
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-zinc-900">
                        #{u.unitNumber}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-700">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-900">
                          {u.name}
                          <NotesIcon notes={u.notes} />
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-600">{u.floor || '—'}</td>
                      <td className="px-5 py-3.5 text-zinc-600">
                        {formatArea(u.areaSqft)}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-zinc-900">
                        {formatRent(u.rentAmount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={
                            'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                            subPropertyStatusBadgeClass(u.status)
                          }
                        >
                          {subPropertyStatusLabel(u.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-700 font-medium">
                        {u.currentTenantName ? `👤 ${u.currentTenantName}` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end items-center gap-1.5">
                          <Link href={`${base}/${u.id}`} className={ghostBtn}>
                            View →
                          </Link>
                          {u.status === 'VACANT' && (
                            <Link
                              href="/dashboard/tenants"
                              className={primaryBtn}
                            >
                              Assign
                            </Link>
                          )}
                          <Link
                            href={`${base}/${u.id}/edit`}
                            className={ghostBtn}
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setTarget(u);
                            }}
                            className={dangerBtn}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* 6. Delete Confirmation Modal */}
      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeConfirm}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div
            ref={trapRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">
              Delete unit
            </h2>
            <p className="mt-1.5 text-sm text-zinc-600">
              Are you sure you want to delete <strong className="text-zinc-900">"{target.name}"</strong> (Unit #{target.unitNumber})? This will permanently remove this unit and its tenancy history.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={deleting}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
