import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  getRentSummary,
  listRentLedgerForOwner,
  listActiveTenancyOptions,
} from '@/lib/rent-ledger';
import { formatMoney } from '@/lib/tenancy-types';
import { resolveDataScope } from '@/lib/manager-access';
import RentFilters from './rent-filters';
import RentTable from './rent-table';
import AddRentEntry from './add-rent-entry';
import ViewOnlyBadge from '../view-only-badge';
import Link from 'next/link';

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    propertyId?: string;
    month?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const sp = await searchParams;

  const ds = await resolveDataScope(session.user);
  const ownerId = ds.ownerId;
  const scope = ds.isManager ? ds.scope : undefined;
  const editableUnitIds: string[] | null = ds.isManager
    ? [...ds.scope.rentEditSubPropertyIds]
    : null;
  const canAdd = editableUnitIds === null || editableUnitIds.length > 0;
  const viewOnly = ds.isManager && !canAdd;

  const [summary, entries, properties, tenancyOptions] = await Promise.all([
    getRentSummary(ownerId, scope),
    listRentLedgerForOwner(ownerId, {
      status: sp.status,
      propertyId: sp.propertyId,
      month: sp.month,
      subPropertyIds: scope?.subPropertyIds,
    }),
    prisma.property.findMany({
      where: { ownerId, ...(scope ? { id: { in: scope.propertyIds } } : {}) },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    listActiveTenancyOptions(
      ownerId,
      ds.isManager
        ? { subPropertyIds: [...ds.scope.rentEditSubPropertyIds] }
        : undefined,
    ),
  ]);

  const collectionRate =
    summary.dueThisMonth > 0
      ? Math.round((summary.collectedThisMonth / summary.dueThisMonth) * 100)
      : summary.collectedThisMonth > 0
        ? 100
        : 0;

  return (
    <div className="min-h-full bg-[#fafaf9]">
      {/* ── Signature Dark Architectural Hero for Rent Ledger ───────────── */}
      <section className="relative overflow-hidden bg-zinc-950 py-12 sm:py-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.8), rgba(9, 9, 11, 0.98)), url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1800&q=80')`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
                <span>💳</span>
                <span>Double-Entry Financial Ledger</span>
                {viewOnly && <ViewOnlyBadge />}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Rent & Collections
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-300 max-w-2xl font-normal">
                Real-time automated rent tracking, receipt logging, payment reconciliation, and audit logs.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/audit-log"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-black/40 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-md transition-all hover:bg-black/60 hover:border-white/40"
              >
                <span>🕒</span> Audit Log
              </Link>
              {canAdd && <AddRentEntry tenancies={tenancyOptions} />}
            </div>
          </div>

          {/* Quick Metrics Bar inside Hero */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Due This Month
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">
                {formatMoney(summary.dueThisMonth)}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Collected This Month
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">
                {formatMoney(summary.collectedThisMonth)}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Total Arrears
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-red-400">
                {formatMoney(summary.overdue)}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Collection Rate
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-blue-400">
                {collectionRate}%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Rent Ledger & Summaries Below ─────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <RentFilters
          properties={properties}
          current={{
            status: sp.status ?? '',
            propertyId: sp.propertyId ?? '',
            month: sp.month ?? '',
          }}
        />

        <RentTable entries={entries} editableUnitIds={editableUnitIds} />
      </div>
    </div>
  );
}
