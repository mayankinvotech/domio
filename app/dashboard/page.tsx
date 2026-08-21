import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { resolveDataScope } from '@/lib/manager-access';
import { getDashboardData } from '@/lib/dashboard';
import { formatMoney } from '@/lib/tenancy-types';
import DomioHero from './_components/domio-hero';
import DomioCalculator from './_components/domio-calculator';
import RentChart from './_components/rent-chart';
import OverdueTenants from './_components/overdue-tenants';
import RecentActivity from './_components/recent-activity';
import AppHubGrid from './_components/app-hub-grid';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const ds = await resolveDataScope(session.user);
  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();

  const data = await getDashboardData(
    ds.ownerId,
    month,
    year,
    ds.isManager ? ds.scope : undefined,
  );

  const activeUnitsCount = data.unitStatuses.filter((u) => u.status !== 'vacant').length;
  const totalUnitsCount = data.unitStatuses.length;
  const occupancyRate = totalUnitsCount > 0 ? Math.round((activeUnitsCount / totalUnitsCount) * 100) : 100;

  return (
    <div className="flex flex-col min-h-full bg-[#fafaf9]">
      {/* 1. Signature Dark Hero with Translucent Glass Action Cards */}
      <DomioHero />

      {/* 2. Main Operational Command Center */}
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        
        {/* Top KPI Metrics Row */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                Financial & Portfolio Pulse
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500">
                Live performance for {data.monthLabel} ({data.fyLabel})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/rent"
                className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-zinc-800"
              >
                Open Rent Ledger →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Due this month */}
            <div className="rounded-2xl border border-[#e1e2e3] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Due This Month
                </p>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
                  {data.monthShort}
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold text-zinc-900">
                {formatMoney(data.monthlyExpected)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Scheduled rent due
              </p>
            </div>

            {/* Collected this month */}
            <div className="rounded-2xl border border-[#e1e2e3] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Collected
                </p>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  {data.collectionRate}% Rate
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold text-emerald-600">
                {formatMoney(data.monthlyCollected)}
              </p>
              <div className="mt-2 w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(data.collectionRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Total Overdue */}
            <div className="rounded-2xl border border-[#e1e2e3] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Total Arrears
                </p>
                {data.totalOverdue > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                    Overdue
                  </span>
                )}
              </div>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold text-red-600">
                {formatMoney(data.totalOverdue)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {data.alerts.overdue.length} tenants require attention
              </p>
            </div>

            {/* Portfolio Occupancy */}
            <div className="rounded-2xl border border-[#e1e2e3] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Occupancy
                </p>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                  {occupancyRate}%
                </span>
              </div>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-bold text-zinc-900">
                {activeUnitsCount} <span className="text-base font-normal text-zinc-500">/ {totalUnitsCount || 1} Units</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {data.alerts.vacant.length} vacant properties
              </p>
            </div>
          </div>
        </div>

        {/* Visual Analytics & Feed Row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* 6-Month Trend Chart (8 cols) */}
          <div className="lg:col-span-8">
            <RentChart data={data.chart} />
          </div>

          {/* Overdue Tenants & Alerts (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <OverdueTenants d={data} />
            <RecentActivity items={data.recentActivity} />
          </div>
        </div>

        {/* All Modules Launcher Grid */}
        <div className="rounded-2xl border border-[#e1e2e3] bg-white p-6 sm:p-8 shadow-xs">
          <AppHubGrid role={session.user.role} />
        </div>

        {/* Landlord Rent Savings Calculator Widget */}
        <div className="overflow-hidden rounded-2xl border border-[#e1e2e3] bg-white shadow-xs">
          <DomioCalculator />
        </div>

      </div>
    </div>
  );
}
