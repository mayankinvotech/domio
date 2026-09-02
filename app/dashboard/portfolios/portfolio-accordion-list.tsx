'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PortfolioType } from '@prisma/client';
import {
  portfolioTypeLabel,
  portfolioTypeBadgeClass,
} from '@/lib/portfolio-types';
import {
  propertyStatusLabel,
  propertyStatusBadgeClass,
} from '@/lib/property-types';
import { formatMoney } from '@/lib/tenancy-types';
import type {
  OverviewPortfolio,
  OverviewProperty,
} from '@/lib/portfolio-overview';
import PropertyUnitsInline from '@/components/portfolios/property-units-inline';
import PortfolioReportButton from '@/components/reports/portfolio-report-button';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { Button, ButtonLink } from '@/components/ui/button';
import AssignTenantModal, { type VacantUnit } from '@/components/portfolios/assign-tenant-modal';
import AddUnitModal from '@/components/portfolios/add-unit-modal';

type Filter = 'ALL' | PortfolioType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
];

const ghostBtn =
  'inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900';
const darkBtn =
  'inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-zinc-800';
const dangerBtn =
  'inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/60 px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-xs transition-all hover:bg-rose-100 hover:border-rose-300';

type DeleteTarget =
  | { kind: 'portfolio'; id: string; name: string }
  | { kind: 'property'; id: string; name: string };

export default function PortfolioAccordionList({
  portfolios,
  canManage = true,
}: {
  portfolios: OverviewPortfolio[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(portfolios);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  useEffect(() => setItems(portfolios), [portfolios]);

  // Lock scroll + close on Escape while the delete modal is open.
  useScrollLock(!!target);
  const trapRef = useFocusTrap<HTMLDivElement>(!!target);
  useEffect(() => {
    if (!target) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deleting) setTarget(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [target, deleting]);

  // Auto-expand a portfolio when arriving via ?open=<portfolioId>
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId) {
      setOpen((prev) => {
        if (prev.has(openId)) return prev;
        const next = new Set(prev);
        next.add(openId);
        return next;
      });
    }
  }, [searchParams]);

  // Stats calculation across all portfolios
  const stats = useMemo(() => {
    const totalPortfolios = items.length;
    let totalProperties = 0;
    let totalUnits = 0;
    let totalOccupied = 0;
    let totalExpected = 0;
    let totalCollected = 0;
    let totalOverdue = 0;

    for (const p of items) {
      totalProperties += p.propertyCount;
      totalUnits += p.unitCount;
      totalOccupied += p.occupiedCount;
      totalExpected += p.monthlyExpected;
      totalCollected += p.monthlyCollected;
      totalOverdue += p.overdueCount;
    }

    const occupancyRate = totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0;
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      totalPortfolios,
      totalProperties,
      totalUnits,
      totalOccupied,
      occupancyRate,
      totalExpected,
      totalCollected,
      collectionRate,
      totalOverdue,
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (filter !== 'ALL' && p.type !== filter) return false;
      if (!q) return true;
      if (p.name.toLowerCase().includes(q)) return true;
      return p.properties.some((pr) => pr.name.toLowerCase().includes(q));
    });
  }, [items, filter, search]);

  function toggle(id: string) {
    const willOpen = !open.has(id);
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    if (willOpen) {
      const portfolio = items.find((p) => p.id === id);
      portfolio?.properties.forEach((pr) => {
        fetch(`/api/properties/${pr.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitsExpanded: true }),
        }).catch(() => {});
      });
    }
  }

  function toggleAll() {
    if (open.size === filtered.length && filtered.length > 0) {
      setOpen(new Set());
    } else {
      setOpen(new Set(filtered.map((p) => p.id)));
    }
  }

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    setDelError(null);
    const url =
      target.kind === 'portfolio'
        ? `/api/portfolios/${target.id}`
        : `/api/properties/${target.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      setTarget(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setDelError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setDeleting(false);
  }

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
              Portfolios
            </h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            Manage your real estate portfolios, properties, units, and occupancy rates.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5">
            <ButtonLink
              href="/dashboard/portfolios/new"
              variant="primary"
              size="md"
              className="font-semibold shadow-sm"
            >
              + Add Portfolio
            </ButtonLink>
          </div>
        )}
      </div>

      {/* 2. Key Metrics Snapshot Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Portfolios */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Portfolios
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-zinc-900">
            {stats.totalPortfolios}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Active groups</p>
        </div>

        {/* Properties */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Properties
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-zinc-900">
            {stats.totalProperties}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">Total buildings</p>
        </div>

        {/* Units & Occupancy */}
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

        {/* Monthly Revenue Collected */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Monthly Rent
            </p>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
              {stats.collectionRate}%
            </span>
          </div>
          <p className="mt-1.5 font-mono text-2xl font-bold text-emerald-600">
            {formatMoney(stats.totalCollected)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            of {formatMoney(stats.totalExpected)} expected
          </p>
        </div>
      </div>

      {/* 3. Filter Bar & Portfolio List — wrapped in a white block card */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden">
        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-zinc-100">
          {/* Category tabs */}
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
                      : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-white hover:text-zinc-900')
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

          {/* Search input + Expand All button */}
          <div className="flex items-center gap-2">
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                className="hidden sm:inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
              >
                {open.size === filtered.length ? 'Collapse All' : 'Expand All'}
              </button>
            )}

            <div className="relative flex-1 sm:w-64">
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
                placeholder="Search portfolios or properties..."
                className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-1.5 pl-9 pr-3 text-xs text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Portfolio List */}
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-3xl">
              🏢
            </div>
            <h2 className="mt-4 text-lg font-bold tracking-tight text-zinc-900">
              No portfolios yet
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Create your first portfolio group to start organizing your properties and units.
            </p>
            <ButtonLink
              href="/dashboard/portfolios/new"
              variant="primary"
              size="md"
              className="mt-5 font-semibold"
            >
              + Add Portfolio
            </ButtonLink>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-zinc-500">
              No portfolios match your current search or filter criteria.
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
        ) : (
          <div className="p-3 space-y-3">
            {filtered.map((p) => {
              const isOpen = open.has(p.id);
              const occRate =
                p.unitCount > 0
                  ? Math.round((p.occupiedCount / p.unitCount) * 100)
                  : 0;
              const collectionRate =
                p.monthlyExpected > 0
                  ? Math.round((p.monthlyCollected / p.monthlyExpected) * 100)
                  : 0;

              return (
                <div
                  key={p.id}
                  className={
                    'rounded-xl border bg-white transition-all duration-200 ' +
                    (isOpen
                      ? 'border-zinc-300 shadow-sm ring-1 ring-zinc-900/5'
                      : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm')
                  }
                >
                  {/* Card Box Layout */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle(p.id);
                      }
                    }}
                    className="overflow-hidden rounded-t-xl cursor-pointer transition-colors hover:bg-zinc-50/40"
                  >
                    {/* Card Top: Icon + Name + Badges + Chevron */}
                    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Portfolio icon block */}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xl">
                          🏢
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-base text-zinc-900 truncate">
                              {p.name}
                            </span>
                            {p.displayId && (
                              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-500">
                                {p.displayId}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span
                              className={
                                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                                portfolioTypeBadgeClass(p.type)
                              }
                            >
                              {portfolioTypeLabel(p.type)}
                            </span>
                            {p.overdueCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                <span className="h-1 w-1 rounded-full bg-rose-500" />
                                {p.overdueCount} overdue
                              </span>
                            )}
                            {p.expiringCount > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                <span className="h-1 w-1 rounded-full bg-amber-500" />
                                {p.expiringCount} expiring
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Chevron */}
                      <div
                        className={
                          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ' +
                          (isOpen
                            ? 'rotate-90 border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 bg-white text-zinc-500')
                        }
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-px border-t border-zinc-100 bg-zinc-100/80">
                      {/* Properties */}
                      <div className="bg-white px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Properties</p>
                        <p className="mt-0.5 text-xl font-bold text-zinc-900">{p.propertyCount}</p>
                      </div>
                      {/* Occupancy */}
                      <div className="bg-white px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Occupancy</p>
                        <p className="mt-0.5 text-xl font-bold text-zinc-900">
                          {p.occupiedCount}
                          <span className="text-sm font-semibold text-zinc-400">/{p.unitCount}</span>
                        </p>
                        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${Math.min(occRate, 100)}%` }}
                          />
                        </div>
                      </div>
                      {/* Revenue */}
                      <div className="bg-white px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rent</p>
                        <p className="mt-0.5 text-sm font-bold text-emerald-600 font-mono truncate">
                          {formatMoney(p.monthlyCollected)}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">of {formatMoney(p.monthlyExpected)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action bar */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex flex-wrap items-center gap-2 border-t border-zinc-100 bg-zinc-50/60 px-4 py-2.5"
                  >
                    <PortfolioReportButton portfolioId={p.id} />
                    {canManage && (
                      <>
                        <Link href={`/dashboard/portfolios/${p.id}/edit`} className={ghostBtn}>
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setDelError(null);
                            setTarget({ kind: 'portfolio', id: p.id, name: p.name });
                          }}
                          className={dangerBtn}
                        >
                          Delete
                        </button>
                        <Link
                          href={`/dashboard/portfolios/${p.id}/properties/new`}
                          className={darkBtn + ' ml-auto'}
                        >
                          + Add Property
                        </Link>
                      </>
                    )}
                  </div>

                  {/* Expanded Properties List */}
                  <PortfolioExpand isOpen={isOpen}>
                    <div className="border-t border-zinc-200/70 bg-zinc-50/80 px-4 py-3 sm:px-5 sm:py-4 space-y-3">
                      {p.properties.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-6 text-center">
                          <p className="text-sm font-medium text-zinc-500">
                            No properties in this portfolio yet.
                          </p>
                          {canManage && (
                            <Link
                              href={`/dashboard/portfolios/${p.id}/properties/new`}
                              className="mt-2 inline-flex text-xs font-bold text-zinc-900 hover:underline"
                            >
                              + Add your first property →
                            </Link>
                          )}
                        </div>
                      ) : (
                        p.properties.map((pr) => (
                          <PropertyRow
                            key={pr.id}
                            portfolioId={p.id}
                            property={pr}
                            canManage={canManage}
                            onDelete={() => {
                              setDelError(null);
                              setTarget({
                                kind: 'property',
                                id: pr.id,
                                name: pr.name,
                              });
                            }}
                          />
                        ))
                      )}
                    </div>
                  </PortfolioExpand>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Delete Confirm Modal */}
      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !deleting && setTarget(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
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
              Delete {target.kind}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-600">
              Are you sure you want to delete <strong className="text-zinc-900">"{target.name}"</strong>? This will permanently remove all associated units and historical records.
            </p>
            {delError && (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
              >
                {delError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => !deleting && setTarget(null)}
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

function PortfolioExpand({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}) {
  const [animating, setAnimating] = useState(false);
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          onAnimationStart={() => setAnimating(true)}
          onAnimationComplete={() => setAnimating(false)}
          style={{ overflow: animating ? 'hidden' : 'visible' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PropertyRow({
  portfolioId,
  property,
  canManage,
  onDelete,
}: {
  portfolioId: string;
  property: OverviewProperty;
  canManage: boolean;
  onDelete: () => void;
}) {
  const base = `/dashboard/portfolios/${portfolioId}/properties/${property.id}`;

  // Inline modal state for this property row
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [assignModalState, setAssignModalState] = useState<{
    open: boolean;
    unit: VacantUnit | null;
  }>({ open: false, unit: null });

  // Collect vacant flat units for quick assignment
  const vacantFlatUnits: VacantUnit[] = property.units
    .filter((u) => u.status === 'VACANT')
    .map((u) => ({
      id: u.id,
      name: u.name,
      unitNumber: u.unitNumber,
      rentAmount: u.rentAmount,
      isRentableEntity: false,
    }));

  const hasVacantUnits = vacantFlatUnits.length > 0 ||
    property.rentableEntities.some((e) => e.isLeaf && e.status === 'VACANT');

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-zinc-300">
      {/* Modals */}
      <AddUnitModal
        isOpen={addUnitOpen}
        onClose={() => setAddUnitOpen(false)}
        propertyId={property.id}
      />
      <AssignTenantModal
        isOpen={assignModalState.open}
        onClose={() => setAssignModalState({ open: false, unit: null })}
        preselectedUnit={assignModalState.unit ?? undefined}
        vacantUnits={vacantFlatUnits}
        propertyId={property.id}
      />

      {/* Property Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base" aria-hidden>
              🏠
            </span>
            <span className="font-bold text-zinc-900 text-base">
              {property.name}
            </span>
            <span
              className={
                'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ' +
                propertyStatusBadgeClass(property.status)
              }
            >
              {propertyStatusLabel(property.status)}
            </span>
            {property.displayId && (
              <span className="font-mono text-[10px] font-semibold text-zinc-400 bg-zinc-50 border border-zinc-200/70 px-1.5 py-0.5 rounded">
                {property.displayId}
              </span>
            )}
            {property.documentCount > 0 && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                📄 {property.documentCount} docs
              </span>
            )}
            {property.managerName && (
              <span className="rounded-full bg-purple-50 border border-purple-200/60 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                👤 {property.managerName}
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-zinc-500 font-medium">
            {property.address}, {property.city}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-zinc-600">
              {property.unitCount} {property.unitCount === 1 ? 'unit' : 'units'} ({property.occupiedCount} occ)
            </span>
            <span className="text-zinc-300">•</span>
            <span className="font-medium text-zinc-600">
              Rent: <strong className="text-zinc-900 font-mono">{formatMoney(property.monthlyCollected)}</strong> / {formatMoney(property.monthlyExpected)}
            </span>
            {property.overdueCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {property.overdueCount} overdue
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                ✓ All collected
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`${base}/units`} className={ghostBtn}>
            Manage Units →
          </Link>
          {canManage && (
            <>
              {/* Restore original + Add Unit link to the full unit/entity form page */}
              <Link href={`${base}/units/new`} className={darkBtn}>
                + Add Unit
              </Link>
              {/* Assign Tenant quick action (shown when there are vacant units) */}
              {hasVacantUnits && (
                <button
                  type="button"
                  onClick={() => setAssignModalState({ open: true, unit: vacantFlatUnits[0] ?? null })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-emerald-700"
                >
                  🔑 Assign Tenant
                </button>
              )}
              <Link href={`${base}/edit`} className={ghostBtn}>
                Edit
              </Link>
              <button type="button" onClick={onDelete} className={dangerBtn}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline expandable units */}
      <PropertyUnitsInline
        propertyId={property.id}
        portfolioId={portfolioId}
        name={property.name}
        type={property.type}
        occupiedCount={property.occupiedCount}
        unitCount={property.unitCount}
        expectedRent={property.monthlyExpected}
        units={property.units.map((u) => ({
          id: u.id,
          name: u.name,
          unitNumber: u.unitNumber,
          status: u.status,
          rentAmount: u.monthlyExpected || u.rentAmount,
          monthlyRent: u.monthlyExpected,
          currentBalance: u.currentBalance,
          floor: u.floor,
          tenantName: u.tenantName,
        }))}
        initialExpanded={true}
        initialSections={property.unitSections}
        rentableEntities={property.rentableEntities}
      />
    </div>
  );
}
