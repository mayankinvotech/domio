import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getPortfolioOverview } from '@/lib/portfolio-overview';
import { listPropertiesForOwner } from '@/lib/properties';
import { listActiveTenancyOptions } from '@/lib/rent-ledger';
import { resolveDataScope } from '@/lib/manager-access';
import { EXPENSE_CATEGORIES } from '@/lib/expense-types';
import { portfolioTypeLabel } from '@/lib/portfolio-types';
import ReportsClient from './reports-client';

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const ds = await resolveDataScope(session.user);
  const scope = ds.isManager ? ds.scope : undefined;

  const [overview, properties, tenancyOptions] = await Promise.all([
    getPortfolioOverview(ds.ownerId, scope),
    listPropertiesForOwner(ds.ownerId, undefined, scope),
    listActiveTenancyOptions(ds.ownerId, scope),
  ]);

  // Portfolio-level financial summary for the page's Excel/CSV quick export.
  const portfolioSummary = overview.map((p) => ({
    Portfolio: p.name,
    Type: portfolioTypeLabel(p.type),
    Properties: p.propertyCount,
    Units: p.unitCount,
    Occupied: p.occupiedCount,
    'Monthly Expected ($)': p.monthlyExpected,
    'Monthly Collected ($)': p.monthlyCollected,
    Overdue: p.overdueCount,
    Expiring: p.expiringCount,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Financial Reports
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Export income statements, collection rates, and tax-ready portfolio summaries.
          </p>
        </div>
      </div>

      <Link
        href="/dashboard/reports/collection"
        className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-5 transition-all hover:shadow-md hover:border-zinc-300 shadow-xs"
      >
        <div className="flex items-center gap-4">
          <span className="text-3xl">📈</span>
          <div>
            <p className="font-bold text-base text-zinc-900">Annual Collection Report</p>
            <p className="text-xs sm:text-sm text-zinc-500">
              Payments received by property × month with dues, totals, and reconciliation matrix.
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-black bg-zinc-100 px-3 py-1.5 rounded-lg">View Matrix →</span>
      </Link>

      <ReportsClient
        portfolioSummary={portfolioSummary}
        portfolios={overview.map((p) => ({ id: p.id, name: p.name }))}
        properties={properties.map((p) => ({ id: p.id, name: p.name }))}
        tenancies={tenancyOptions.map((t) => ({
          id: t.tenancyId,
          label: t.label,
        }))}
        categories={EXPENSE_CATEGORIES.map((c) => ({
          value: c.value,
          label: c.label,
        }))}
      />
    </div>
  );
}
