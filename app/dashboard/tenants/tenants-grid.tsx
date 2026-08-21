'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { TenantListItem } from '@/lib/tenants';
import {
  tenancyStatusBadgeClass,
  tenancyStatusLabel,
} from '@/lib/tenancy-types';
import ViewToggle, { type View } from '@/components/ui/view-toggle';
import ExportButton from '@/components/ui/export-button';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';

const STORAGE_KEY = 'domio-tenants-view';
const UNASSIGNED_BADGE =
  'border border-zinc-200 bg-zinc-100 text-zinc-600';

// Payment-status colour (theme-aware CSS variable) for a tenant.
function statusVar(t: TenantListItem): string {
  const ct = t.currentTenancy;
  if (!ct) return 'var(--unit-inactive)';
  if (ct.currentBalance >= 0) return 'var(--unit-paid)';
  const months =
    ct.monthlyRent > 0 ? Math.ceil(Math.abs(ct.currentBalance) / ct.monthlyRent) : 99;
  return months >= 2 ? 'var(--unit-red)' : 'var(--unit-amber)';
}

const LEGEND: { label: string; color: string }[] = [
  { label: 'Paid in Full', color: 'var(--unit-paid)' },
  { label: '1 Mo Overdue', color: 'var(--unit-amber)' },
  { label: '2+ Mo Overdue', color: 'var(--unit-red)' },
  { label: 'Unassigned', color: 'var(--unit-inactive)' },
];

export type TenantSortOption =
  | 'default'
  | 'overdue_desc'
  | 'overdue_asc'
  | 'payment_desc'
  | 'payment_asc'
  | 'name_asc';

export type TenantFilterTab = 'all' | 'paid' | 'overdue' | 'unassigned';

function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export default function TenantsGrid({
  tenants,
}: {
  tenants: TenantListItem[];
}) {
  const [items, setItems] = useState(tenants);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TenantFilterTab>('all');
  const [target, setTarget] = useState<TenantListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('card');
  const [sortBy, setSortBy] = useState<TenantSortOption>('default');
  const [mounted, setMounted] = useState(false);

  // Sync state when props change
  useEffect(() => {
    setItems(tenants);
  }, [tenants]);

  // Lock scroll + close on Escape while the delete modal is open.
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
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'card' || saved === 'table') setView(saved);
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
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
    const res = await fetch(`/api/tenants/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== target.id));
      setTarget(null);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setDeleting(false);
  }

  function unitLabel(t: TenantListItem) {
    return t.currentTenancy ? t.currentTenancy.unitName : '—';
  }

  function StatusBadge({ t }: { t: TenantListItem }) {
    if (t.currentTenancy) {
      return (
        <span
          className={
            'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ' +
            tenancyStatusBadgeClass(t.currentTenancy.status)
          }
        >
          {tenancyStatusLabel(t.currentTenancy.status)}
        </span>
      );
    }
    return (
      <span
        className={
          'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ' +
          UNASSIGNED_BADGE
        }
      >
        Unassigned
      </span>
    );
  }

  // Filter and Sort Pipeline
  const filteredItems = useMemo(() => {
    let result = [...items];

    // 1. Text Search Filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.email && t.email.toLowerCase().includes(q)) ||
          t.phone.toLowerCase().includes(q) ||
          (t.displayId && t.displayId.toLowerCase().includes(q)) ||
          (t.currentTenancy && t.currentTenancy.unitName.toLowerCase().includes(q))
      );
    }

    // 2. Tab Filter
    if (activeTab === 'paid') {
      result = result.filter(
        (t) => t.currentTenancy && t.overdueAmount === 0 && t.currentTenancy.currentBalance >= 0
      );
    } else if (activeTab === 'overdue') {
      result = result.filter((t) => t.overdueAmount > 0);
    } else if (activeTab === 'unassigned') {
      result = result.filter((t) => !t.currentTenancy);
    }

    // 3. Sorting
    if (sortBy === 'overdue_desc') {
      result.sort((a, b) => b.overdueAmount - a.overdueAmount);
    } else if (sortBy === 'overdue_asc') {
      result.sort((a, b) => a.overdueAmount - b.overdueAmount);
    } else if (sortBy === 'payment_desc') {
      result.sort((a, b) => b.totalPaid - a.totalPaid);
    } else if (sortBy === 'payment_asc') {
      result.sort((a, b) => a.totalPaid - b.totalPaid);
    } else if (sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [items, searchQuery, activeTab, sortBy]);

  // Quick KPI metrics calculation
  const totalCount = items.length;
  const assignedCount = items.filter((t) => t.currentTenancy).length;
  const overdueCount = items.filter((t) => t.overdueAmount > 0).length;
  const totalOverdueSum = items.reduce((acc, t) => acc + (t.overdueAmount || 0), 0);
  const totalPaidSum = items.reduce((acc, t) => acc + (t.totalPaid || 0), 0);

  // Rows for Excel/CSV export
  const exportRows = filteredItems.map((t) => ({
    'Tenant ID': t.displayId ?? '',
    Name: t.name,
    Email: t.email,
    Phone: t.phone,
    Unit: t.currentTenancy?.unitName ?? '',
    'Monthly Rent': t.currentTenancy?.monthlyRent ?? '',
    'Overdue Amount': t.overdueAmount,
    'Total Paid': t.totalPaid,
    'Current Balance': t.currentTenancy?.currentBalance ?? '',
    Status: t.currentTenancy
      ? tenancyStatusLabel(t.currentTenancy.status)
      : 'Unassigned',
  }));

  if (!mounted) return <div className="h-32" />;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              Tenants
            </h1>
            <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 font-medium text-xs text-zinc-600">
              {totalCount} Total
            </span>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-zinc-500">
            Tenant roster, contact directory, and lease balance tracking.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1.5">
            <ExportButton
              rows={exportRows}
              filename="tenant-ledger"
              sheetName="Tenants"
            />
            <ViewToggle view={view} onChange={changeView} />
          </div>
          <Link
            href="/dashboard/tenants/new"
            className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-95 shadow-sm"
          >
            <span>+</span> Add Tenant
          </Link>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        {/* Total Tenants */}
        <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Total Tenants
          </p>
          <p className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-zinc-900">
            {totalCount}
          </p>
          <p className="text-[11px] text-zinc-500 truncate">
            {assignedCount} active in lease
          </p>
        </div>

        {/* Total Collected */}
        <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Collected
          </p>
          <p className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-emerald-600">
            ${totalPaidSum.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600/80 font-medium">
            Lifetime receipts
          </p>
        </div>

        {/* Outstanding Arrears */}
        <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Overdue
          </p>
          <p className={`mt-0.5 font-mono text-xl sm:text-2xl font-bold ${totalOverdueSum > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            ${totalOverdueSum.toLocaleString()}
          </p>
          <p className="text-[11px] text-zinc-500 truncate">
            {overdueCount} behind
          </p>
        </div>

        {/* Occupancy / Assigned */}
        <div className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Leased
          </p>
          <p className="mt-0.5 font-mono text-xl sm:text-2xl font-bold text-zinc-700">
            {assignedCount}
          </p>
          <p className="text-[11px] text-zinc-500 truncate">
            {totalCount - assignedCount} unassigned
          </p>
        </div>
      </div>

      {/* Search & Swipeable Filter Bar */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-200 bg-white p-2.5 sm:p-3 shadow-sm">
        {/* Search input with 44px thumb touch height */}
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, unit, or ID..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-8 text-sm text-zinc-900 placeholder-zinc-400 transition-all focus:border-zinc-400 focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-zinc-400 hover:text-zinc-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Horizontal Touch Scrollable Filter Pills + Sort Dropdown */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                activeTab === 'all'
                  ? 'bg-zinc-900 text-white shadow-sm'
                  : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paid')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                activeTab === 'paid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-emerald-700'
              }`}
            >
              Paid ({items.filter((t) => t.currentTenancy && t.overdueAmount === 0).length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('overdue')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                activeTab === 'overdue'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-red-700'
              }`}
            >
              Overdue ({overdueCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unassigned')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                activeTab === 'unassigned'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'bg-zinc-100 border border-zinc-200 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Open ({totalCount - assignedCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500 shrink-0">
            <span className="font-semibold text-[10px] uppercase text-zinc-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TenantSortOption)}
              className="bg-transparent font-medium text-zinc-700 focus:outline-none cursor-pointer text-xs"
            >
              <option value="default">Date Added</option>
              <option value="overdue_desc">Overdue: High</option>
              <option value="overdue_asc">Overdue: Low</option>
              <option value="payment_desc">Paid: High</option>
              <option value="name_asc">Name A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Colour Legend */}
      <div
        data-testid="tenant-legend"
        className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[11px] text-zinc-500 shadow-sm"
      >
        <span className="font-semibold text-[10px] uppercase tracking-wider text-zinc-400">Status:</span>
        {LEGEND.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full ring-1 ring-zinc-300"
              style={{ background: l.color }}
              aria-hidden
            />
            {l.label}
          </span>
        ))}
      </div>

      {/* Results View */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-900">No tenants match your search</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Try clearing filters or changing search query.
          </p>
          {(searchQuery || activeTab !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
              className="mt-3 inline-flex rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : view === 'card' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((t) => (
            <div
              key={t.id}
              data-testid="tenant-card"
              style={{ borderLeftColor: statusVar(t), borderLeftWidth: 4 }}
              className="group flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md"
            >
              <div>
                {/* Top: Name + ID + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/tenants/${t.id}`}
                      className="text-base sm:text-lg font-bold text-zinc-900 transition-colors hover:text-zinc-700 block truncate"
                    >
                      {t.name}
                    </Link>
                    {t.displayId && (
                      <p className="font-mono text-[10px] font-medium text-zinc-400">
                        {t.displayId}
                      </p>
                    )}
                  </div>
                  <StatusBadge t={t} />
                </div>

                {/* Direct Phone Contact Quick Actions */}
                <div className="mt-2.5 flex items-center gap-2">
                  {t.phone && (
                    <a
                      href={`tel:${sanitizePhone(t.phone)}`}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 active:scale-95"
                    >
                      <span>📞</span> Call
                    </a>
                  )}
                  {t.phone && (
                    <a
                      href={`https://wa.me/${sanitizePhone(t.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 active:scale-95"
                    >
                      <span>💬</span> WhatsApp
                    </a>
                  )}
                  {t.email && (
                    <a
                      href={`mailto:${t.email}`}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600 transition-colors hover:text-zinc-900 active:scale-95 truncate max-w-[110px]"
                    >
                      <span>✉️</span> Email
                    </a>
                  )}
                </div>

                {/* Ledger Details List */}
                <dl className="mt-3 space-y-1.5 border-t border-zinc-100 pt-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Unit</dt>
                    <dd className="font-semibold text-zinc-900 truncate">
                      {unitLabel(t)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Overdue Dues</dt>
                    <dd className={`font-mono font-bold ${t.overdueAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {t.overdueAmount > 0 ? `$${t.overdueAmount.toLocaleString()}` : '$0.00 (Current)'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Total Paid</dt>
                    <dd className="font-mono font-bold text-zinc-900">
                      ${t.totalPaid.toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Card Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2.5">
                <Link
                  href={`/dashboard/tenants/${t.id}/assign`}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-100 active:scale-95"
                >
                  Assign Unit
                </Link>
                <Link
                  href={`/dashboard/tenants/${t.id}/edit`}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-50 active:scale-95"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setTarget(t);
                  }}
                  className="ml-auto rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 font-mono text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-5 py-3.5 font-bold">Tenant</th>
                <th className="px-5 py-3.5 font-bold">ID</th>
                <th className="px-5 py-3.5 font-bold">Unit</th>
                <th className="px-5 py-3.5 font-bold">Phone / Email</th>
                <th className="px-5 py-3.5 font-bold">Overdue</th>
                <th className="px-5 py-3.5 font-bold">Total Paid</th>
                <th className="px-5 py-3.5 font-bold">Status</th>
                <th className="px-5 py-3.5 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.map((t, i) => (
                <tr
                  key={t.id}
                  data-testid="tenant-row"
                  style={{ boxShadow: `inset 4px 0 0 0 ${statusVar(t)}` }}
                  className={i % 2 === 0 ? 'bg-white hover:bg-zinc-50' : 'bg-zinc-50/50 hover:bg-zinc-50'}
                >
                  <td className="px-5 py-3 font-semibold text-zinc-900">
                    <Link
                      href={`/dashboard/tenants/${t.id}`}
                      className="font-bold hover:text-zinc-700 transition-colors"
                    >
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-400 font-medium">
                    {t.displayId ?? '—'}
                  </td>
                  <td className="px-5 py-3 font-medium text-zinc-800">
                    {unitLabel(t)}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <p className="font-mono text-zinc-800">{t.phone}</p>
                    <p className="text-zinc-500 truncate max-w-[160px]">{t.email || '—'}</p>
                  </td>
                  <td className="px-5 py-3 font-mono font-bold">
                    <span className={t.overdueAmount > 0 ? 'text-red-600' : 'text-emerald-600'}>
                      {t.overdueAmount > 0 ? `$${t.overdueAmount.toLocaleString()}` : '$0'}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono font-bold text-zinc-900">
                    ${t.totalPaid.toLocaleString()}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge t={t} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <Link
                        href={`/dashboard/tenants/${t.id}/assign`}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                      >
                        Assign
                      </Link>
                      <Link
                        href={`/dashboard/tenants/${t.id}/edit`}
                        className="rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setTarget(t);
                        }}
                        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
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

      {/* Floating Action Button (FAB) for Mobile "+ Add Tenant" */}
      <div className="fixed right-4 bottom-20 z-30 lg:hidden">
        <Link
          href="/dashboard/tenants/new"
          aria-label="Add new tenant"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg active:scale-90 transition-all font-bold text-2xl"
        >
          +
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
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
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              Delete Tenant
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Are you sure you want to delete <span className="font-semibold text-zinc-900">{target.name}</span>? This action cannot be undone.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeConfirm}
                disabled={deleting}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
