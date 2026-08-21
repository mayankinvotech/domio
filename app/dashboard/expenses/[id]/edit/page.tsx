import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedExpense, getOwnerStructure } from '@/lib/expenses';
import type { ExpenseLevel } from '@/lib/expense-types';
import ExpenseForm from '../../expense-form';

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id } = await params;
  const [expense, structure] = await Promise.all([
    getOwnedExpense(id, session.user.id),
    getOwnerStructure(session.user.id),
  ]);
  if (!expense) notFound();

  const level: ExpenseLevel = expense.subPropertyId
    ? 'UNIT'
    : expense.propertyId
      ? 'PROPERTY'
      : 'PORTFOLIO';

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/expenses"
        className="text-sm text-[#E8E8F2] transition-colors hover:text-white"
      >
        ← Back to Expenses
      </Link>

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">
          Edit Expense
        </h1>
        <ExpenseForm
          mode="edit"
          structure={structure}
          expense={{
            id: expense.id,
            level,
            portfolioId: expense.portfolioId,
            propertyId: expense.propertyId,
            subPropertyId: expense.subPropertyId,
            category: expense.category,
            amount: expense.amount,
            date: expense.date.toISOString().slice(0, 10),
            description: expense.description,
          }}
        />
      </div>
    </div>
  );
}
