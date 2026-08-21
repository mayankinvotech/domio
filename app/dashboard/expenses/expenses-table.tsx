'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import type { ExpenseListItem } from '@/lib/expenses';
import {
  expenseCategoryBadgeClass,
  expenseCategoryLabel,
} from '@/lib/expense-types';
import { formatMoney, formatDate } from '@/lib/tenancy-types';

const LEVEL_LABEL: Record<ExpenseListItem['level'], string> = {
  PORTFOLIO: 'Portfolio',
  PROPERTY: 'Property',
  UNIT: 'Unit',
};

export default function ExpensesTable({
  expenses,
}: {
  expenses: ExpenseListItem[];
}) {
  const [items, setItems] = useState(expenses);
  const [target, setTarget] = useState<ExpenseListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(expenses);
  }, [expenses]);

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

  function closeConfirm() {
    if (deleting) return;
    setTarget(null);
    setError(null);
  }

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/expenses/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== target.id));
      setTarget(null);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setDeleting(false);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
        <p className="text-sm text-[#E8E8F2]">No expenses found</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-[#1A1A2A]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#1A1A2A] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Property Name</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A2A]">
            {items.map((e, i) => (
              <tr
                key={e.id}
                className={
                  i % 2 === 0 ? 'bg-[#0E0C22]' : 'bg-[rgba(255,255,255,0.02)]'
                }
              >
                <td className="px-4 py-3 text-[#6A6A8A]">
                  {formatDate(e.date)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                      expenseCategoryBadgeClass(e.category)
                    }
                  >
                    {expenseCategoryLabel(e.category)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#6A6A8A]">
                  {e.description || '—'}
                </td>
                <td className="px-4 py-3 font-medium text-white">
                  {formatMoney(e.amount)}
                </td>
                <td className="px-4 py-3 text-[#6A6A8A]">
                  {LEVEL_LABEL[e.level]}
                </td>
                <td className="px-4 py-3 text-[#6A6A8A]">{e.contextName}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/expenses/${e.id}/edit`}
                      className="rounded-full border border-zinc-200 bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium text-[#E8E8F2] transition-colors hover:text-white"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setTarget(e);
                      }}
                      className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
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

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeConfirm}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            ref={trapRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Delete expense
            </h2>
            <p className="mt-2 text-sm text-[#E8E8F2]">
              Delete this {expenseCategoryLabel(target.category)} expense of{' '}
              {formatMoney(target.amount)}? This action cannot be undone.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
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
    </>
  );
}
