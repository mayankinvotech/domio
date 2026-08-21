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
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

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
      <div className="rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
        <p className="text-sm text-[#E8E8F2]">No rent entries found</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-[#1A1A2A]">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-[#1A1A2A] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Due Date</th>
              <th className="px-4 py-3 font-medium">Rent Projected</th>
              <th className="px-4 py-3 font-medium">Amount Due</th>
              <th className="px-4 py-3 font-medium">Amount Paid</th>
              <th className="px-4 py-3 font-medium">Payment Date</th>
              <th className="px-4 py-3 font-medium">Rent For</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.name} className="divide-y divide-[#1A1A2A]">
              <tr className="bg-[#0E0C22]">
                <td
                  colSpan={13}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#B0B0C8]"
                >
                  {group.name}
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
                    style={
                      overdue
                        ? { backgroundColor: 'rgba(239,68,68,0.05)' }
                        : undefined
                    }
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {e.tenantName}
                    </td>
                    <td className="px-4 py-3 text-[#6A6A8A]">
                      Unit {e.unitNumber}
                    </td>
                    <td className="px-4 py-3 text-[#6A6A8A]">{e.propertyName}</td>
                    <td className="px-4 py-3 text-[#6A6A8A]">
                      {formatDate(e.dueDate)}
                    </td>
                    {/* Rent Projected — always shown */}
                    <td className="px-4 py-3 text-white">
                      {formatMoney(e.monthlyRent)}
                    </td>
                    {/* Amount Due — only past/current */}
                    <td className="px-4 py-3 text-[#E8A020]">
                      {future ? (
                        <span className="text-[#4A4A6A]">—</span>
                      ) : (
                        formatMoney(e.amountDue)
                      )}
                    </td>
                    {/* Amount Paid */}
                    <td className="px-4 py-3">
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
                    {/* Payment Date */}
                    <td className="px-4 py-3 text-[#6A6A8A]">
                      {e.paidDate ? dmyFmt.format(new Date(e.paidDate)) : '—'}
                    </td>
                    {/* Rent For */}
                    <td className="px-4 py-3 text-[#6A6A8A]">
                      {e.rentFor ? dmyFmt.format(new Date(e.rentFor)) : '—'}
                    </td>
                    {/* Method */}
                    <td className="px-4 py-3 text-[#6A6A8A]">
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
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
                      {e.notes ? (
                        <NotesIcon notes={e.notes} />
                      ) : (
                        <span className="text-xs text-[#4A4A6A]">—</span>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
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
                            className="rounded-full border border-zinc-300 bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
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
                              className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-2.5 py-1 text-xs text-[#B0B0C8] transition-colors hover:text-white disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRow(e)}
                              disabled={pending}
                              className="rounded-full border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-[rgba(239,68,68,0.2)] disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {!canPay && !rowEditable && (
                          <span className="text-xs text-[#4A4A6A]">—</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitPayment}
            className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Record Payment
            </h2>
            <p className="mt-1 mb-4 text-sm text-[#B0B0C8]">
              {target.tenantName} · Unit {target.unitNumber} ·{' '}
              {formatMoney(target.amountDue)} due
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
                  <span className="text-[#B0B0C8]">(which period this covers)</span>
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
                  Reference Number <span className="text-[#B0B0C8]">(optional)</span>
                </label>
                <input id="reference" name="reference" type="text" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes" className={labelClass}>
                  Notes <span className="text-[#B0B0C8]">(optional)</span>
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
                className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {error}
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

      {editTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitEdit}
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Edit Rent Record
            </h2>
            <p className="mt-1 mb-4 text-sm text-[#B0B0C8]">
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
                  <span className="text-[#B0B0C8]">(optional)</span>
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
                  <span className="text-[#B0B0C8]">(which period this covers)</span>
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
                  <span className="text-[#B0B0C8]">
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
                  <span className="text-[#B0B0C8]">(optional)</span>
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
                  Notes <span className="text-[#B0B0C8]">(optional)</span>
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
                  <span className="text-[#B0B0C8]">(optional)</span>
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
                className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {error}
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
                {pending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
