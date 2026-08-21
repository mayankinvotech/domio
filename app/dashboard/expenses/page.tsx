import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  getExpensePageSummary,
  listExpensesForOwner,
} from '@/lib/expenses';
import { expenseCategoryLabel } from '@/lib/expense-types';
import { formatMoney, formatDate } from '@/lib/tenancy-types';
import { resolveDataScope } from '@/lib/manager-access';
import ExpenseFilters from './expense-filters';
import ExpensesTable from './expenses-table';
import ViewOnlyBadge from '../view-only-badge';
import ExpenseExportButton from '@/components/reports/expense-export-button';
import ExportButton from '@/components/ui/export-button';

const EXPENSE_LEVEL_LABEL = {
  PORTFOLIO: 'Portfolio',
  PROPERTY: 'Property',
  UNIT: 'Unit',
} as const;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    propertyId?: string;
    range?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const sp = await searchParams;

  const ds = await resolveDataScope(session.user);
  const ownerId = ds.ownerId;
  const scope = ds.isManager ? ds.scope : undefined;
  const canEdit =
    !ds.isManager ||
    ds.scope.editPropertyIds.size > 0 ||
    ds.scope.editSubPropertyIds.size > 0;
  const viewOnly = ds.isManager && !canEdit;

  const [summary, expenses, properties] = await Promise.all([
    getExpensePageSummary(ownerId, scope),
    listExpensesForOwner(ownerId, {
      category: sp.category,
      propertyId: sp.propertyId,
      range: sp.range,
      from: sp.from,
      to: sp.to,
      scope,
    }),
    prisma.property.findMany({
      where: { ownerId, ...(scope ? { id: { in: scope.propertyIds } } : {}) },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  // Rows for Excel/CSV export — mirrors the visible table columns.
  const exportRows = expenses.map((e) => ({
    Date: formatDate(e.date),
    Category: expenseCategoryLabel(e.category),
    Description: e.description ?? '',
    'Amount ($)': e.amount,
    Level: EXPENSE_LEVEL_LABEL[e.level],
    'Property Name': e.propertyName ?? e.contextName,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Expenses
          </h1>
          {viewOnly && <ViewOnlyBadge />}
        </div>
        <div className="flex items-center gap-2">
          <ExpenseExportButton
            propertyId={sp.propertyId}
            category={sp.category}
            dateFrom={sp.from}
            dateTo={sp.to}
          />
          {canEdit && (
            <Link
              href="/dashboard/expenses/new"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-95 shadow-sm"
            >
              + Add Expense
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#e1e2e3] bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Total This Month
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-zinc-900">
            {formatMoney(summary.thisMonth)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e1e2e3] bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Total This Year
          </p>
          <p className="mt-1.5 font-mono text-2xl font-bold text-zinc-900">
            {formatMoney(summary.thisYear)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#e1e2e3] bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Top Categories
          </p>
          {summary.topCategories.length === 0 ? (
            <p className="mt-1.5 text-sm text-zinc-500">No expenses yet</p>
          ) : (
            <ul className="mt-2 space-y-1 text-xs sm:text-sm">
              {summary.topCategories.map((c) => (
                <li key={c.category} className="flex justify-between gap-3">
                  <span className="text-zinc-600">
                    {expenseCategoryLabel(c.category)}
                  </span>
                  <span className="font-mono font-semibold text-zinc-900">
                    {formatMoney(c.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6">
        <ExpenseFilters
          properties={properties}
          current={{
            category: sp.category ?? '',
            propertyId: sp.propertyId ?? '',
            range: sp.range ?? '',
            from: sp.from ?? '',
            to: sp.to ?? '',
          }}
        />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex justify-end">
          <ExportButton
            rows={exportRows}
            filename="expenses"
            sheetName="Expenses"
          />
        </div>
        <ExpensesTable expenses={expenses} />
      </div>
    </div>
  );
}
