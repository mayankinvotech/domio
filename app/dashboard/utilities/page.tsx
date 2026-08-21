import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  getUtilitySummary,
  listUtilityAccountsForOwner,
  listRecentBillsForOwner,
} from '@/lib/utilities';
import { formatMoney } from '@/lib/tenancy-types';
import { resolveDataScope } from '@/lib/manager-access';
import AccountsSection from './accounts-section';
import RecentBills from './recent-bills';
import ViewOnlyBadge from '../view-only-badge';

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'gold' | 'red' | 'white';
}) {
  const color =
    tone === 'gold'
      ? 'text-zinc-900'
      : tone === 'red'
        ? 'text-red-600'
        : 'text-zinc-900';
  return (
    <div className="rounded-2xl border border-[#e1e2e3] bg-white p-5 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={'mt-1.5 font-mono text-2xl font-bold ' + color}>{value}</p>
    </div>
  );
}

export default async function UtilitiesPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const ds = await resolveDataScope(session.user);
  const ownerId = ds.ownerId;
  const scope = ds.isManager ? ds.scope : undefined;
  const canEdit =
    !ds.isManager ||
    ds.scope.editPropertyIds.size > 0 ||
    ds.scope.editSubPropertyIds.size > 0;
  const viewOnly = ds.isManager && !canEdit;

  const [summary, accounts, bills] = await Promise.all([
    getUtilitySummary(ownerId, scope),
    listUtilityAccountsForOwner(ownerId, { scope }),
    listRecentBillsForOwner(ownerId, { scope }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Utilities
          </h1>
          {viewOnly && <ViewOnlyBadge />}
        </div>
        {canEdit && (
          <Link
            href="/dashboard/utilities/accounts/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-95 shadow-sm"
          >
            + Add Account
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Unpaid Bills"
          value={String(summary.unpaidCount)}
          tone="gold"
        />
        <SummaryCard
          label="Total Overdue"
          value={String(summary.overdueCount)}
          tone="red"
        />
        <SummaryCard
          label="Amount Outstanding"
          value={formatMoney(summary.amountOutstanding)}
          tone="red"
        />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold tracking-tight text-zinc-900">
        Utility Accounts
      </h2>
      <AccountsSection accounts={accounts} />

      <h2 className="mb-3 mt-8 text-lg font-bold tracking-tight text-zinc-900">
        Recent Bills
      </h2>
      <RecentBills bills={bills} />
    </div>
  );
}
