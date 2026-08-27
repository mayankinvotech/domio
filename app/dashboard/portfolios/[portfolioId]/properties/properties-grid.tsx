'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { PropertyListItem } from '@/lib/properties';
import type { PropertyType } from '@prisma/client';
import {
  propertyTypeBadgeClass,
  propertyTypeLabel,
  propertyStatusBadgeClass,
  propertyStatusLabel,
} from '@/lib/property-types';
import ViewToggle, { type View } from '@/components/ui/view-toggle';
import NotesIcon from '@/components/ui/notes-icon';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { ButtonLink } from '@/components/ui/button';

const STORAGE_KEY = 'domio-properties-view';

const ghostBtn =
  'inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-xs transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900';
const primaryBtn =
  'inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-1 text-xs font-semibold text-white shadow-xs transition-all hover:bg-zinc-800';
const dangerBtn =
  'inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/60 px-3 py-1 text-xs font-semibold text-rose-600 shadow-xs transition-all hover:bg-rose-100 hover:border-rose-300';

type TypeFilter = 'ALL' | PropertyType;

const FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
];

export default function PropertiesGrid({
  portfolioId,
  portfolioName,
  properties,
}: {
  portfolioId: string;
  portfolioName: string;
  properties: PropertyListItem[];
}) {
  const [items, setItems] = useState(properties);
  const [target, setTarget] = useState<PropertyListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('card');
  const [filter, setFilter] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(properties);
  }, [properties]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'card' || saved === 'table') setView(saved);
    setMounted(true);
  }, []);

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
    const res = await fetch(`/api/properties/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== target.id));
      setTarget(null);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setDeleting(false);
  }

  function editHref(id: string) {
    return `/dashboard/portfolios/${portfolioId}/properties/${id}/edit`;
  }

  function unitsHref(id: string) {
    return `/dashboard/portfolios/${portfolioId}/properties/${id}/units`;
  }

  const stats = useMemo(() => {
    const totalProperties = items.length;
    let totalUnits = 0;
    let totalOccupied = 0;
    for (const p of items) {
      totalUnits += p.unitCount;
      totalOccupied += p.occupiedCount;
    }
    const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
    return { totalProperties, totalUnits, totalOccupied, occupancyRate };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (filter !== 'ALL' && p.type !== filter) return false;
      if (!q) return true;
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.address.toLowerCase().includes(q)) return true;
      if (p.city.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [items, filter, search]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 text-base">
              🏢
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
              {portfolioName}
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Properties within this portfolio group.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <ButtonLink
            href={`/dashboard/portfolios/${portfolioId}/properties/new`}
            variant="primary"
            size="md"
            className="font-semibold shadow-sm"
          >
            + Add Property
          </ButtonLink>
        </div>
      </div>

      {/* 2. Key Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Properties
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-zinc-900">
            {stats.totalProperties}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Total buildings</p>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Units
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-zinc-900">
            {stats.totalUnits}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Total rentable spaces</p>
        </div>

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
            {stats.totalOccupied}/{stats.totalUnits}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(stats.occupancyRate, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Portfolio
          </p>
          <p className="mt-1.5 text-sm font-bold text-zinc-900 truncate">
            {portfolioName}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Active portfolio</p>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const isSelected = filter === f.value;
            const count =
              f.value === 'ALL'
                ? items.length
                : items.filter((p) => p.type === f.value).length;

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

        <div className="flex items-center gap-2">
          <ViewToggle view={view} onChange={changeView} />
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
              placeholder="Search properties..."
              className="w-full rounded-full border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-xs text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            />
          </div>
        </div>
      </div>

      {/* 4. Properties Grid / Table */}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-3xl">
            🏢
          </div>
          <h2 className="mt-4 text-lg font-bold tracking-tight text-zinc-900">
            No properties yet
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Add a property building to this portfolio.
          </p>
          <ButtonLink
            href={`/dashboard/portfolios/${portfolioId}/properties/new`}
            variant="primary"
            size="md"
            className="mt-5 font-semibold"
          >
            + Add Property
          </ButtonLink>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-xs">
          <p className="text-sm font-medium text-zinc-500">
            No properties match your filter.
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
          {filtered.map((p) => {
            const occRate = p.unitCount > 0 ? Math.round((p.occupiedCount / p.unitCount) * 100) : 0;

            return (
              <div
                key={p.id}
                className="flex flex-col rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-1.5 font-bold text-zinc-900 text-base">
                      {p.name}
                      <NotesIcon notes={p.notes} />
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {p.address}, {p.city}
                    </p>
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                      propertyStatusBadgeClass(p.status)
                    }
                  >
                    {propertyStatusLabel(p.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-1 flex-col justify-between border-t border-zinc-100 pt-3">
                  <div className="flex flex-wrap items-center justify-between text-xs mb-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                          propertyTypeBadgeClass(p.type)
                        }
                      >
                        {propertyTypeLabel(p.type)}
                      </span>
                      {p.customType && (
                        <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          🏷️ {p.customType}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-zinc-700">
                      {p.occupiedCount}/{p.unitCount} occupied ({occRate}%)
                    </span>
                  </div>

                  {p.ownerName && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                      <span>👤 {p.ownerName}</span>
                      {p.ownerPhone && <span>📞 {p.ownerPhone}</span>}
                      {p.ownerEmail && <span>✉️ {p.ownerEmail}</span>}
                    </div>
                  )}

                  {p.utilityAccountCount > 0 && (
                    <p className="mt-1 text-[11px] text-zinc-400">
                      ⚡ {p.utilityAccountCount} utility accounts
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-zinc-100 pt-3">
                  <Link href={unitsHref(p.id)} className={ghostBtn}>
                    Manage Units ({p.unitCount}) →
                  </Link>
                  <Link href={`${unitsHref(p.id)}/new`} className={primaryBtn}>
                    + Add Unit
                  </Link>
                  <Link href={editHref(p.id)} className={ghostBtn}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setTarget(p);
                    }}
                    className={dangerBtn}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-xs">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
              <tr>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Address</th>
                <th className="px-5 py-3.5">City</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Units</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-zinc-50/70">
                  <td className="px-5 py-3.5 font-bold text-zinc-900">
                    <span className="inline-flex items-center gap-1.5">
                      {p.name}
                      <NotesIcon notes={p.notes} />
                    </span>
                    {p.ownerName && (
                      <div className="text-[11px] font-normal text-zinc-400">
                        Owner: {p.ownerName} {p.ownerPhone ? `(${p.ownerPhone})` : ''}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600">{p.address}</td>
                  <td className="px-5 py-3.5 text-zinc-600">{p.city}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={
                          'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                          propertyTypeBadgeClass(p.type)
                        }
                      >
                        {propertyTypeLabel(p.type)}
                      </span>
                      {p.customType && (
                        <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          🏷️ {p.customType}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={
                        'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                        propertyStatusBadgeClass(p.status)
                      }
                    >
                      {propertyStatusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={unitsHref(p.id)}
                      className="font-bold text-zinc-900 hover:underline"
                    >
                      {p.unitCount} {p.unitCount === 1 ? 'unit' : 'units'}
                    </Link>
                    <div className="text-xs text-zinc-400">
                      {p.occupiedCount}/{p.unitCount} occupied
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end items-center gap-1.5">
                      <Link href={unitsHref(p.id)} className={ghostBtn}>
                        Units →
                      </Link>
                      <Link href={`${unitsHref(p.id)}/new`} className={primaryBtn}>
                        + Unit
                      </Link>
                      <Link href={editHref(p.id)} className={ghostBtn}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setTarget(p);
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

      {/* 5. Delete Confirmation Modal */}
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
              Delete property
            </h2>
            <p className="mt-1.5 text-sm text-zinc-600">
              Are you sure you want to delete <strong className="text-zinc-900">"{target.name}"</strong>? This will permanently remove all associated units.
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

