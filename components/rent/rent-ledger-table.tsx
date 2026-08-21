'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RentLedgerItem } from '@/lib/rent-ledger';
import { rentStatusBadgeClass, rentStatusLabel } from '@/lib/rent-types';
import { formatMoney } from '@/lib/tenancy-types';
import {
  PAYMENT_METHODS,
  DEFAULT_PAYMENT_METHOD,
  paymentMethodIcon,
  paymentMethodLabel,
} from '@/lib/payment-method-types';
import NotesIcon from '@/components/ui/notes-icon';

const monthFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
});

// "01 Jun 2026" — actual payment-received date.
const dmyFmt = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function RentLedgerTable({
  subPropertyId,
  title,
  addEntryTenancyId,
}: {
  subPropertyId: string;
  // When provided, render a section header (lavender uppercase).
  title?: string;
  // When provided, show an "Add Entry" button that posts to this tenancy.
  addEntryTenancyId?: string;
}) {
  const [entries, setEntries] = useState<RentLedgerItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<RentLedgerItem | null>(null);
  const [pending, setPending] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await fetch(
      `/api/rent-ledger?subPropertyId=${encodeURIComponent(subPropertyId)}`,
    );
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries as RentLedgerItem[]);
    } else {
      setLoadError('Could not load rent entries.');
      setEntries([]);
    }
  }, [subPropertyId]);

  useEffect(() => {
    setEntries(null);
    load();
  }, [load]);

  function closeModal() {
    if (pending) return;
    setTarget(null);
    setPayError(null);
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    setPending(true);
    setPayError(null);
    const d = new FormData(event.currentTarget);
    const res = await fetch(`/api/rent-ledger/${target.id}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountPaid: d.get('amountPaid'),
        paymentDate: d.get('paymentDate'),
        paymentMethod: d.get('paymentMethod'),
        reference: d.get('reference'),
        notes: d.get('notes'),
      }),
    });
    if (res.ok) {
      setTarget(null);
      await load(); // inline refresh, no full page reload
    } else {
      const json = await res.json().catch(() => null);
      setPayError(json?.error ?? 'Failed to record payment. Please try again.');
    }
    setPending(false);
  }

  async function submitAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addEntryTenancyId) return;
    setPending(true);
    setAddError(null);
    const d = new FormData(event.currentTarget);
    const res = await fetch('/api/rent-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenancyId: addEntryTenancyId,
        dueDate: d.get('dueDate'),
        amountDue: d.get('amountDue'),
      }),
    });
    if (res.ok) {
      setAddOpen(false);
      await load();
    } else {
      const json = await res.json().catch(() => null);
      setAddError(json?.error ?? 'Failed to add entry. Please try again.');
    }
    setPending(false);
  }

  const header =
    title || addEntryTenancyId ? (
      <div className="mb-3 flex items-center justify-between gap-2">
        {title ? (
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {title}
          </h3>
        ) : (
          <span />
        )}
        {addEntryTenancyId && (
          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setAddOpen(true);
            }}
            className="rounded-full border border-zinc-300 bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Add Entry
          </button>
        )}
      </div>
    ) : null;

  const addModal = addOpen ? (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!pending) setAddOpen(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submitAdd}
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.9)] p-6 shadow-2xl backdrop-blur-xl"
      >
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Add Rent Entry
        </h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-due" className={labelClass}>
              Due Date
            </label>
            <input
              id="add-due"
              name="dueDate"
              type="date"
              required
              defaultValue={today()}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-amt" className={labelClass}>
              Amount Due
            </label>
            <input
              id="add-amt"
              name="amountDue"
              type="number"
              min="0"
              step="any"
              required
              className={inputClass}
            />
          </div>
        </div>
        {addError && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
          >
            {addError}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (!pending) setAddOpen(false);
            }}
            disabled={pending}
            className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Add Entry'}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  if (entries === null) {
    return (
      <>
        {header}
        <p className="px-1 py-3 text-sm text-[#B0B0C8]">Loading rent entries…</p>
        {addModal}
      </>
    );
  }

  if (loadError) {
    return (
      <>
        {header}
        <p className="px-1 py-3 text-sm text-red-400">{loadError}</p>
        {addModal}
      </>
    );
  }

  if (entries.length === 0) {
    return (
      <>
        {header}
        <p className="rounded-lg border border-dashed border-[#312D58] bg-[#0E0C22] px-3 py-4 text-center text-sm text-[#B0B0C8]">
          No rent entries yet
        </p>
        {addModal}
      </>
    );
  }

  const nowMs = Date.now();
  const isFuture = (e: RentLedgerItem) => new Date(e.dueDate).getTime() > nowMs;

  const totalProjected = entries.reduce((s, e) => s + e.monthlyRent, 0);
  const totalDue = entries.reduce(
    (s, e) => (isFuture(e) ? s : s + e.amountDue),
    0,
  );
  const totalPaid = entries.reduce((s, e) => s + e.amountPaid, 0);
  const totalBalance = totalDue - totalPaid;

  return (
    <>
      {header}
      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="sticky left-0 bg-[#100d24] px-3 py-2 font-medium">
                Month
              </th>
              <th className="px-3 py-2 font-medium">Rent Projected</th>
              <th className="px-3 py-2 font-medium">Rent Due</th>
              <th className="px-3 py-2 font-medium">Rent Paid</th>
              <th className="px-3 py-2 font-medium">Balance</th>
              <th className="px-3 py-2 font-medium">Payment Date</th>
              <th className="px-3 py-2 font-medium">Method</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {entries.map((e) => {
              const future = isFuture(e);
              const balance = e.amountDue - e.amountPaid;
              const canPay =
                !future &&
                (e.status === 'DUE' ||
                  e.status === 'OVERDUE' ||
                  e.status === 'PARTIAL');
              return (
                <tr
                  key={e.id}
                  className={
                    'transition-colors hover:bg-zinc-50 ' +
                    (!future && e.status === 'OVERDUE'
                      ? 'bg-[rgba(239,68,68,0.05)]'
                      : '')
                  }
                >
                  <td className="sticky left-0 bg-[#0c0a1e] px-3 py-2 text-white">
                    {monthFmt.format(new Date(e.dueDate))}
                  </td>
                  {/* Rent Projected — always shown (contracted rent) */}
                  <td className="px-3 py-2 text-white">
                    {formatMoney(e.monthlyRent)}
                  </td>
                  {/* Rent Due — only past/current months */}
                  <td className="px-3 py-2 text-[#E8A020]">
                    {future ? (
                      <span className="text-[#4A4A6A]">—</span>
                    ) : (
                      formatMoney(e.amountDue)
                    )}
                  </td>
                  {/* Rent Paid */}
                  <td className="px-3 py-2">
                    {future ? (
                      <span className="text-[#4A4A6A]">—</span>
                    ) : e.amountPaid > 0 ? (
                      <span className="text-zinc-500">
                        {formatMoney(e.amountPaid)}
                      </span>
                    ) : (
                      <span className="text-[#4A4A6A]">—</span>
                    )}
                  </td>
                  {/* Balance */}
                  <td className="px-3 py-2 font-medium">
                    {future ? (
                      <span className="text-[#4A4A6A]">—</span>
                    ) : (
                      <span
                        className={
                          balance > 0 ? 'text-[#ef4444]' : 'text-zinc-500'
                        }
                      >
                        {formatMoney(balance)}
                      </span>
                    )}
                  </td>
                  {/* Payment Date */}
                  <td className="px-3 py-2 text-[#6A6A8A]">
                    {e.paidDate ? dmyFmt.format(new Date(e.paidDate)) : '—'}
                  </td>
                  {/* Method */}
                  <td className="px-3 py-2 text-[#6A6A8A]">
                    {e.paymentMethod ? (
                      <span title={paymentMethodLabel(e.paymentMethod)}>
                        {paymentMethodIcon(e.paymentMethod)}{' '}
                        {paymentMethodLabel(e.paymentMethod)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  {/* Status */}
                  <td className="px-3 py-2">
                    {future ? (
                      <span className="inline-flex rounded-full bg-[rgba(255,255,255,0.06)] px-2.5 py-0.5 text-xs font-medium text-[#4A4A6A]">
                        Future
                      </span>
                    ) : (
                      <span
                        className={
                          'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                          rentStatusBadgeClass(e.status)
                        }
                      >
                        {rentStatusLabel(e.status)}
                      </span>
                    )}
                  </td>
                  {/* Notes */}
                  <td className="px-3 py-2">
                    {e.notes ? (
                      <NotesIcon notes={e.notes} />
                    ) : (
                      <span className="text-xs text-[#4A4A6A]">—</span>
                    )}
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-2 text-right">
                    {canPay ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPayError(null);
                          setTarget(e);
                        }}
                        className="rounded-full border border-zinc-300 bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
                      >
                        Record Payment
                      </button>
                    ) : (
                      <span className="text-xs text-[#4A4A6A]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-200 bg-zinc-50 font-semibold">
              <td className="sticky left-0 bg-[#100d24] px-3 py-2 text-white">
                Total
              </td>
              <td className="px-3 py-2 text-white">
                {formatMoney(totalProjected)}
              </td>
              <td className="px-3 py-2 text-[#E8A020]">
                {formatMoney(totalDue)}
              </td>
              <td className="px-3 py-2 text-zinc-500">
                {formatMoney(totalPaid)}
              </td>
              <td
                className={
                  'px-3 py-2 ' +
                  (totalBalance > 0 ? 'text-[#ef4444]' : 'text-zinc-500')
                }
              >
                {formatMoney(totalBalance)}
              </td>
              <td className="px-3 py-2" colSpan={5} />
            </tr>
          </tfoot>
        </table>
      </div>

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitPayment}
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.9)] p-6 shadow-2xl backdrop-blur-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Record Payment
            </h2>
            <p className="mt-1 mb-4 text-sm text-[#B0B0C8]">
              {monthFmt.format(new Date(target.dueDate))} ·{' '}
              {formatMoney(target.amountDue)} due
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rlt-amount" className={labelClass}>
                  Amount Paid
                </label>
                <input
                  id="rlt-amount"
                  name="amountPaid"
                  type="number"
                  min="0"
                  step="any"
                  required
                  defaultValue={target.amountDue}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rlt-date" className={labelClass}>
                  Payment Received Date
                </label>
                <input
                  id="rlt-date"
                  name="paymentDate"
                  type="date"
                  required
                  defaultValue={today()}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rlt-method" className={labelClass}>
                  Payment Method
                </label>
                <select
                  id="rlt-method"
                  name="paymentMethod"
                  defaultValue={DEFAULT_PAYMENT_METHOD}
                  className={inputClass}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rlt-ref" className={labelClass}>
                  Reference Number{' '}
                  <span className="text-[#B0B0C8]">(optional)</span>
                </label>
                <input
                  id="rlt-ref"
                  name="reference"
                  type="text"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rlt-notes" className={labelClass}>
                  Notes <span className="text-[#B0B0C8]">(optional)</span>
                </label>
                <textarea
                  id="rlt-notes"
                  name="notes"
                  rows={3}
                  placeholder="e.g. Paid late, partial payment for January, paid via bank transfer ref TXN123"
                  className={inputClass + ' resize-y'}
                />
              </div>
            </div>

            {payError && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {payError}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </form>
        </div>
      )}
      {addModal}
    </>
  );
}
