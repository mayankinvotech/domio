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

type Filter = 'ALL' | PortfolioType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
];

const ghostBtn =
  'rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:border-zinc-400';
const violetBtn =
  'rounded-full border border-zinc-300 bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800';
const dangerBtn =
  'rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10';

type DeleteTarget =
  | { kind: 'portfolio'; id: string; name: string }
  | { kind: 'property'; id: string; name: string };

export default function PortfolioAccordionList({
  portfolios,
  canManage = true,
}: {
  portfolios: OverviewPortfolio[];
  // Managers (read-scoped) don't see owner management actions.
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

  // Auto-expand a portfolio when arriving via ?open=<portfolioId> (e.g. from
  // the dashboard snapshot or a breadcrumb).
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
    // On open: expand every child property's unit section + persist to DB.
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
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Portfolios
        </h1>
        {canManage && (
          <ButtonLink href="/dashboard/portfolios/new" variant="primary" size="md">
            + Add Portfolio
          </ButtonLink>
        )}
      </div>

      {/* Filter bar */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors ' +
                (filter === f.value
                  ? 'border border-zinc-700 bg-zinc-900 text-white'
                  : 'border border-zinc-300 bg-white text-zinc-500 hover:text-zinc-900')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search portfolios..."
          className="w-full max-w-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-500/20"
        />
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
          <div className="text-5xl">🏢</div>
          <p className="mt-4 text-lg font-semibold text-white">
            No portfolios yet
          </p>
          <p className="mt-1 text-sm text-[#6A6A8A]">
            Add your first portfolio to start managing your properties
          </p>
          <ButtonLink
            href="/dashboard/portfolios/new"
            variant="primary"
            size="md"
            className="mt-5"
          >
            + Add Portfolio
          </ButtonLink>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[#6A6A8A]">
          No portfolios match your filters.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((p) => {
            const isOpen = open.has(p.id);
            return (
              <div
                key={p.id}
                className={
                  'overflow-hidden rounded-2xl border border-[#312D58] bg-[#17152F] ' +
                  (isOpen ? 'border-l-2 border-l-[#18181b]' : '')
                }
              >
                {/* Portfolio header row */}
                <button
                  type="button"
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                >
                  <span className="text-zinc-500">{isOpen ? '▼' : '▶'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{p.name}</span>
                      <span
                        className={
                          'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ' +
                          portfolioTypeBadgeClass(p.type)
                        }
                      >
                        {portfolioTypeLabel(p.type)}
                      </span>
                      <span className="text-xs text-[#6A6A8A]">
                        {p.propertyCount} props · {p.occupiedCount}/{p.unitCount}{' '}
                        units
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#6A6A8A]">
                      {formatMoney(p.monthlyCollected)}/
                      {formatMoney(p.monthlyExpected)} collected
                      {p.overdueCount > 0 && (
                        <span className="text-red-400">
                          {' '}
                          · {p.overdueCount} overdue
                        </span>
                      )}
                      {p.expiringCount > 0 && (
                        <span className="text-[#E8A020]">
                          {' '}
                          · {p.expiringCount} expiring
                        </span>
                      )}
                    </p>
                  </div>
                  {p.displayId && (
                    <span className="ml-auto shrink-0 self-start font-mono text-[11px] text-[#4A4A6A]">
                      {p.displayId}
                    </span>
                  )}
                </button>

                {/* Portfolio actions (Report for all; manage actions owner-only) */}
                <div className="flex flex-wrap gap-2 border-t border-[#312D58] px-5 py-3">
                  <PortfolioReportButton portfolioId={p.id} />
                  {canManage && (
                    <>
                      <ButtonLink
                        href={`/dashboard/portfolios/${p.id}/edit`}
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </ButtonLink>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setDelError(null);
                          setTarget({ kind: 'portfolio', id: p.id, name: p.name });
                        }}
                      >
                        Delete
                      </Button>
                      <ButtonLink
                        href={`/dashboard/portfolios/${p.id}/properties/new`}
                        variant="ghost"
                        size="sm"
                      >
                        + Add Property
                      </ButtonLink>
                    </>
                  )}
                </div>

                {/* Expanded properties */}
                <PortfolioExpand isOpen={isOpen}>
                  <div className="space-y-3 border-t border-[#312D58] bg-[#0E0C22] p-4">
                        {p.properties.length === 0 ? (
                          <p className="py-2 text-center text-sm text-[#6A6A8A]">
                            No properties yet
                            {canManage && (
                              <>
                                {' · '}
                                <Link
                                  href={`/dashboard/portfolios/${p.id}/properties/new`}
                                  className="text-zinc-500 hover:text-white"
                                >
                                  Add one →
                                </Link>
                              </>
                            )}
                          </p>
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

      {/* Delete confirm modal */}
      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !deleting && setTarget(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        >
          <div
            ref={trapRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Delete {target.kind}
            </h2>
            <p className="mt-2 text-sm text-[#E8E8F2]">
              Are you sure you want to delete {target.name}? This action cannot be
              undone.
            </p>
            {delError && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {delError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !deleting && setTarget(null)}
                disabled={deleting}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Animated height collapse for a portfolio's properties. Clips only while the
// open/close animation runs, then switches to overflow:visible so nested
// inline-unit sections can grow without being cut off (no row limit).
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
  return (
    <div className="rounded-xl border border-[#1A1A2A] bg-[#17152F] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden>🏠</span>
        <span className="font-semibold text-white">{property.name}</span>
        <span
          className={
            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ' +
            propertyStatusBadgeClass(property.status)
          }
        >
          {propertyStatusLabel(property.status)}
        </span>
        {property.displayId && (
          <span className="font-mono text-[11px] text-[#4A4A6A]">
            {property.displayId}
          </span>
        )}
        <span className="text-xs text-[#6A6A8A]">
          {property.unitCount} units · {property.occupiedCount} occ
        </span>
        {property.documentCount > 0 && (
          <span className="text-xs text-[#6A6A8A]">
            📄 {property.documentCount}
          </span>
        )}
        {property.managerName && (
          <span className="text-xs text-zinc-500">
            👤 {property.managerName}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-[#6A6A8A]">
        {property.address}, {property.city}
      </p>
      <p className="mt-1 text-xs text-[#6A6A8A]">
        Rent: {formatMoney(property.monthlyCollected)}/
        {formatMoney(property.monthlyExpected)}
        {property.overdueCount > 0 ? (
          <span className="text-red-400"> · {property.overdueCount} overdue</span>
        ) : (
          <span className="text-emerald-400"> · All paid ✅</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/dashboard/portfolios/${portfolioId}/properties`}
          className={ghostBtn}
        >
          View Properties →
        </Link>
        {canManage && (
          <>
            <Link href={`${base}/units/new`} className={violetBtn}>
              + Add Unit
            </Link>
            <Link href={`${base}/edit`} className={ghostBtn}>
              Edit
            </Link>
            <button type="button" onClick={onDelete} className={dangerBtn}>
              Delete
            </button>
          </>
        )}
      </div>

      {/* Inline expandable units (replaces the old slide-out panel) */}
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
          // Occupied → the active tenancy's monthly rent; vacant → listed rent.
          rentAmount: u.monthlyExpected || u.rentAmount,
          monthlyRent: u.monthlyExpected,
          currentBalance: u.currentBalance,
          floor: u.floor,
          tenantName: u.tenantName,
        }))}
        initialExpanded={true}
        initialSections={property.unitSections}
      />
    </div>
  );
}
