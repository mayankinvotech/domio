'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RentLedgerItem } from '@/lib/rent-ledger';
import { rentStatusBadgeClass, rentStatusLabel } from '@/lib/rent-types';
import { formatMoney, formatDate } from '@/lib/tenancy-types';
import {
  PAYMENT_METHODS,
  DEFAULT_PAYMENT_METHOD,
  paymentMethodIcon,
  paymentMethodLabel,
} from '@/lib/payment-method-types';
import NotesIcon from '@/components/ui/notes-icon';
import { RENT_STATUSES } from '@/lib/rent-types';
import AuditHistoryPopover from '@/components/rent/audit-history-popover';

const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-zinc-700';

// "01 Jun 2026" — payment/rent-for dates are stored at UTC midnight, so format
// in UTC to keep the calendar day stable across timezones.
const dmyFmt = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function RentTable({
  entries,
  editableUnitIds = null,
}: {
  entries: RentLedgerItem[];
  // null = owner (edit everything); otherwise the units the manager may edit.
  editableUnitIds?: string[] | null;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<RentLedgerItem | null>(null);
  const [editTarget, setEditTarget] = useState<RentLedgerItem | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEditRow = (e: RentLedgerItem) =>
    editableUnitIds === null || (e.subPropertyId ? editableUnitIds.includes(e.subPropertyId) : false);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; items: RentLedgerItem[] }>();
    for (const e of entries) {
      if (!map.has(e.propertyId)) {
        map.set(e.propertyId, { name: e.propertyName, items: [] });
      }
      map.get(e.propertyId)!.items.push(e);
    }
    return [...map.values()];
  }, [entries]);

  function closeModal() {
    if (pending) return;
    setTarget(null);
    setEditTarget(null);
    setError(null);
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget) return;
    setPending(true);
    setError(null);
    const d = new FormData(event.currentTarget);
    const res = await fetch(`/api/rent-ledger/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dueDate: d.get('dueDate'),
        amountDue: d.get('amountDue'),
        amountPaid: d.get('amountPaid'),
        paidDate: d.get('paidDate') || null,
        rentFor: d.get('rentFor') || null,
        paymentMethod: d.get('paymentMethod') || null,
        reference: d.get('reference'),
        notes: d.get('notes'),
        status: d.get('status') || undefined,
        reason: String(d.get('reason') ?? '').trim() || undefined,
      }),
    });
    if (res.ok) {
      setEditTarget(null);
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? 'Failed to save changes. Please try again.');
    }
    setPending(false);
  }

  async function deleteRow(e: RentLedgerItem) {
    const ok = window.confirm(
      `Delete the ${formatDate(e.dueDate)} rent record for ${e.tenantName} (Unit ${e.unitNumber})?\n\nThis removes ${formatMoney(
        e.amountDue,
      )} due from your rent reports and summaries.`,
    );
    if (!ok) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/rent-ledger/${e.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? 'Failed to delete record.');
    }
    setPending(false);
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;
    setPending(true);
    setError(null);
    const d = new FormData(event.currentTarget);
    const res = await fetch(`/api/rent-ledger/${target.id}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountPaid: d.get('amountPaid'),
        paymentDate: d.get('paymentDate'),
        rentFor: d.get('rentFor') || null,
        paymentMethod: d.get('paymentMethod'),
        reference: d.get('reference'),
        notes: d.get('notes'),
      }),
    });
    if (res.ok) {
      setTarget(null);
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? 'Failed to record payment. Please try again.');
    }
    setPending(false);
  }
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center shadow-xs">
        <p className="text-sm font-semibold text-zinc-700">No rent entries found</p>
        <p className="mt-1 text-xs text-zinc-500">There are no rent ledger records matching your current filter.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200/90 bg-white shadow-xs">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50/90 text-[11px] font-bold uppercase tracking-wider text-zinc-600">
            <tr>
              <th className="px-4 py-3.5">Tenant</th>
              <th className="px-4 py-3.5">Unit</th>
              <th className="px-4 py-3.5">Property</th>
              <th className="px-4 py-3.5">Due Date</th>
              <th className="px-4 py-3.5">Rent Projected</th>
              <th className="px-4 py-3.5">Amount Due</th>
              <th className="px-4 py-3.5">Amount Paid</th>
              <th className="px-4 py-3.5">Payment Date</th>
              <th className="px-4 py-3.5">Rent For</th>
              <th className="px-4 py-3.5">Method</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Notes</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.name} className="divide-y divide-zinc-100">
              <tr className="border-y border-zinc-200 bg-zinc-100/80">
                <td
                  colSpan={13}
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-800"
                >
                  🏢 {group.name}
                </td>
              </tr>
              {group.items.map((e) => {
                const future = new Date(e.dueDate).getTime() > Date.now();
                const overdue = !future && e.status === 'OVERDUE';
                const rowEditable = canEditRow(e);
                const canPay =
                  rowEditable &&
                  !future &&
                  (e.status === 'DUE' ||
                    e.status === 'OVERDUE' ||
                    e.status === 'PARTIAL');
                return (
                  <tr
                    key={e.id}
                    className={`transition-colors hover:bg-zinc-50/80 ${
                      overdue ? 'bg-red-50/35 hover:bg-red-50/60' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3.5 font-bold text-zinc-900">
                      {e.tenantName}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-zinc-600">
                      Unit {e.unitNumber}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-zinc-600">{e.propertyName}</td>
                    <td className="px-4 py-3.5 font-medium text-zinc-600">
                      {formatDate(e.dueDate)}
                    </td>
                    {/* Rent Projected — always shown */}
                    <td className="px-4 py-3.5 font-bold font-mono text-zinc-900">
                      {formatMoney(e.monthlyRent)}
                    </td>
                    {/* Amount Due — only past/current */}
                    <td className="px-4 py-3.5 font-bold font-mono text-amber-700">
                      {future ? (
                        <span className="text-zinc-400 font-normal font-sans">—</span>
                      ) : (
                        formatMoney(e.amountDue)
                      )}
                    </td>
                    {/* Amount Paid */}
                    <td className="px-4 py-3.5 font-bold font-mono">
                      {future ? (
                        <span className="text-zinc-400 font-normal font-sans">—</span>
                      ) : e.amountPaid > 0 ? (
                        <span className="text-emerald-700">
                          {formatMoney(e.amountPaid)}
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-normal font-sans">—</span>
                      )}
                    </td>
                    {/* Payment Date */}
                    <td className="px-4 py-3.5 font-medium text-zinc-600">
                      {e.paidDate ? dmyFmt.format(new Date(e.paidDate)) : <span className="text-zinc-400">—</span>}
                    </td>
                    {/* Rent For */}
                    <td className="px-4 py-3.5 font-medium text-zinc-600">
                      {e.rentFor ? dmyFmt.format(new Date(e.rentFor)) : <span className="text-zinc-400">—</span>}
                    </td>
                    {/* Method */}
                    <td className="px-4 py-3.5 font-medium text-zinc-600">
                      {e.paymentMethod ? (
                        <span title={paymentMethodLabel(e.paymentMethod)} className="inline-flex items-center gap-1">
                          {paymentMethodIcon(e.paymentMethod)}{' '}
                          {paymentMethodLabel(e.paymentMethod)}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {future ? (
                        <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
                          Future
                        </span>
                      ) : (
                        <span
                          className={
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
                            rentStatusBadgeClass(e.status)
                          }
                        >
                          {rentStatusLabel(e.status)}
                        </span>
                      )}
                    </td>
                    {/* Notes */}
                    <td className="px-4 py-3.5">
                      {e.notes ? (
                        <NotesIcon notes={e.notes} />
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <AuditHistoryPopover
                          entity="RENT_LEDGER"
                          entityId={e.id}
                        />
                        {canPay && (
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setTarget(e);
                            }}
                            className="rounded-full bg-zinc-900 px-3.5 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800"
                          >
                            Record Payment
                          </button>
                        )}
                        {rowEditable && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setEditTarget(e);
                              }}
                              disabled={pending}
                              className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-100 hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRow(e)}
                              disabled={pending}
                              className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 shadow-xs transition hover:bg-red-100 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {!canPay && !rowEditable && (
                          <span className="text-xs text-zinc-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitPayment}
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">
              Record Payment
            </h2>
            <p className="mt-1 mb-4 text-xs font-medium text-zinc-500">
              {target.tenantName} · Unit {target.unitNumber} ·{' '}
              <strong className="text-zinc-900">{formatMoney(target.amountDue)} due</strong>
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="amountPaid" className={labelClass}>
                  Amount Paid
                </label>
                <input
                  id="amountPaid"
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
                <label htmlFor="paymentDate" className={labelClass}>
                  Payment Received Date
                </label>
                <input
                  id="paymentDate"
                  name="paymentDate"
                  type="date"
                  required
                  defaultValue={today()}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rentFor" className={labelClass}>
                  Rent For{' '}
                  <span className="text-zinc-400 font-normal">(which period this covers)</span>
                </label>
                <input
                  id="rentFor"
                  name="rentFor"
                  type="date"
                  defaultValue={today()}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="paymentMethod" className={labelClass}>
                  Payment Method
                </label>
                <select
                  id="paymentMethod"
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
                <label htmlFor="reference" className={labelClass}>
                  Reference Number <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input id="reference" name="reference" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes" className={labelClass}>
                  Notes <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="e.g. Paid late, partial payment for January, paid via bank transfer ref TXN123"
                  className={inputClass + ' resize-y'}
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Save Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitEdit}
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">
              Edit Rent Record
            </h2>
            <p className="mt-1 mb-4 text-xs font-medium text-zinc-500">
              {editTarget.tenantName} · Unit {editTarget.unitNumber}
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-dueDate" className={labelClass}>
                  Due Date
                </label>
                <input
                  id="e-dueDate"
                  name="dueDate"
                  type="date"
                  required
                  defaultValue={new Date(editTarget.dueDate)
                    .toISOString()
                    .slice(0, 10)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-amountDue" className={labelClass}>
                  Amount Due
                </label>
                <input
                  id="e-amountDue"
                  name="amountDue"
                  type="number"
                  min="1"
                  step="any"
                  required
                  defaultValue={editTarget.amountDue}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-amountPaid" className={labelClass}>
                  Amount Paid
                </label>
                <input
                  id="e-amountPaid"
                  name="amountPaid"
                  type="number"
                  min="0"
                  step="any"
                  required
                  defaultValue={editTarget.amountPaid}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-paidDate" className={labelClass}>
                  Payment Date{' '}
                  <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  id="e-paidDate"
                  name="paidDate"
                  type="date"
                  defaultValue={
                    editTarget.paidDate
                      ? new Date(editTarget.paidDate).toISOString().slice(0, 10)
                      : ''
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-rentFor" className={labelClass}>
                  Rent For{' '}
                  <span className="text-zinc-400 font-normal">(which period this covers)</span>
                </label>
                <input
                  id="e-rentFor"
                  name="rentFor"
                  type="date"
                  defaultValue={
                    editTarget.rentFor
                      ? new Date(editTarget.rentFor).toISOString().slice(0, 10)
                      : ''
                  }
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-method" className={labelClass}>
                  Payment Method
                </label>
                <select
                  id="e-method"
                  name="paymentMethod"
                  defaultValue={editTarget.paymentMethod ?? ''}
                  className={inputClass}
                >
                  <option value="">— None —</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-status" className={labelClass}>
                  Status{' '}
                  <span className="text-zinc-400 font-normal">
                    (leave to auto-compute)
                  </span>
                </label>
                <select
                  id="e-status"
                  name="status"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">Auto (from amounts &amp; due date)</option>
                  {RENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-reference" className={labelClass}>
                  Reference Number{' '}
                  <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  id="e-reference"
                  name="reference"
                  type="text"
                  defaultValue={editTarget.reference ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-notes" className={labelClass}>
                  Notes <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <textarea
                  id="e-notes"
                  name="notes"
                  rows={2}
                  defaultValue={editTarget.notes ?? ''}
                  className={inputClass + ' resize-y'}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-reason" className={labelClass}>
                  Reason for change{' '}
                  <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  id="e-reason"
                  name="reason"
                  type="text"
                  placeholder="e.g. corrected amount due"
                  className={inputClass}
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
              >
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
