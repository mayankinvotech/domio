'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/tenancy-types';
import ExportButton, { type ExportRow } from '@/components/ui/export-button';
import AuditHistoryPopover from '@/components/rent/audit-history-popover';

type LedgerEntryType = 'RENT_CHARGE' | 'PAYMENT' | 'ADJUSTMENT';

type LedgerEntry = {
  id: string;
  type: LedgerEntryType;
  amount: number; // signed: negative = charge/debit, positive = payment/credit
  date: string;
  rentFor: string | null; // rental period this entry is for
  description: string;
};

// Dates are stored at UTC midnight — format in UTC so the calendar day never
// shifts across timezones.
const dmyFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

function today() {
  return new Date().toISOString().slice(0, 10);
}

const TYPE_BADGE: Record<LedgerEntryType, { label: string; cls: string }> = {
  RENT_CHARGE: {
    label: 'Charge',
    cls: 'bg-[rgba(232,160,32,0.12)] text-[#E8A020] border-[rgba(232,160,32,0.3)]',
  },
  PAYMENT: {
    label: 'Payment',
    cls: 'bg-[rgba(34,197,94,0.12)] text-green-400 border-[rgba(34,197,94,0.3)]',
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    cls: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  },
};

// null = closed; {mode:'add'} = new payment/charge; {mode:'edit'} = existing row.
type ModalState =
  | { mode: 'add'; type: 'PAYMENT' | 'RENT_CHARGE' }
  | { mode: 'edit'; entry: LedgerEntry }
  | null;

export default function LedgerEntryTable({
  tenancyId,
  title = 'Transaction Ledger',
  canEdit = false,
}: {
  tenancyId: string;
  title?: string;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<LedgerEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [editType, setEditType] = useState<LedgerEntryType>('PAYMENT');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Starts with `await` so the mount effect triggers no synchronous setState;
  // `entries === null` already renders the loading state on first mount.
  const load = useCallback(async () => {
    const res = await fetch(`/api/ledger/${encodeURIComponent(tenancyId)}`);
    if (res.ok) {
      const data = await res.json();
      setLoadError(null);
      setEntries(data.entries as LedgerEntry[]);
    } else {
      setLoadError('Could not load ledger entries.');
      setEntries([]);
    }
  }, [tenancyId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh both this table and the server-rendered balance panels around it.
  const afterMutation = useCallback(async () => {
    await load();
    router.refresh();
  }, [load, router]);

  function openAdd(type: 'PAYMENT' | 'RENT_CHARGE') {
    setFormError(null);
    setModal({ mode: 'add', type });
  }

  function openEdit(entry: LedgerEntry) {
    setFormError(null);
    setEditType(entry.type);
    setModal({ mode: 'edit', entry });
  }

  async function submitAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal?.mode !== 'add') return;
    setPending(true);
    setFormError(null);
    const d = new FormData(event.currentTarget);
    // Send a magnitude — the server applies the sign for the type.
    const res = await fetch(`/api/ledger/${encodeURIComponent(tenancyId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: modal.type,
        amount: Math.round(Number(d.get('amount'))),
        date: d.get('date'),
        rentFor: d.get('rentFor') || null,
        description: d.get('description'),
      }),
    });
    if (res.ok) {
      setModal(null);
      await afterMutation();
    } else {
      const json = await res.json().catch(() => null);
      setFormError(json?.error ?? 'Failed to save entry. Please try again.');
    }
    setPending(false);
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (modal?.mode !== 'edit') return;
    setPending(true);
    setFormError(null);
    const d = new FormData(event.currentTarget);
    const reason = String(d.get('reason') ?? '').trim();
    const res = await fetch(
      `/api/ledger/${encodeURIComponent(tenancyId)}/entries/${modal.entry.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editType,
          amount: Math.round(Number(d.get('amount'))),
          date: d.get('date'),
          rentFor: d.get('rentFor') || null,
          description: d.get('description'),
          reason: reason || undefined,
        }),
      },
    );
    if (res.ok) {
      setModal(null);
      await afterMutation();
    } else {
      const json = await res.json().catch(() => null);
      setFormError(json?.error ?? 'Failed to save changes. Please try again.');
    }
    setPending(false);
  }

  async function deleteEntry(entry: LedgerEntry) {
    // Deleting a row reverses its effect on the balance — spell that out.
    const delta = -entry.amount;
    const dir = delta > 0 ? 'increase' : 'reduce';
    const ok = window.confirm(
      `Delete this ${TYPE_BADGE[entry.type].label.toLowerCase()} of ${formatMoney(
        Math.abs(entry.amount),
      )}?\n\nThis will ${dir} what the tenant owes by ${formatMoney(
        Math.abs(delta),
      )}.`,
    );
    if (!ok) return;
    setPending(true);
    const res = await fetch(
      `/api/ledger/${encodeURIComponent(tenancyId)}/entries/${entry.id}`,
      { method: 'DELETE' },
    );
    if (res.ok) {
      await afterMutation();
    } else {
      const json = await res.json().catch(() => null);
      setLoadError(json?.error ?? 'Failed to delete entry.');
    }
    setPending(false);
  }

  const renderHeader = (exportRows?: ExportRow[]) => (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h3>
      <div className="flex items-center gap-2">
        {exportRows && exportRows.length > 0 && (
          <ExportButton
            rows={exportRows}
            filename="rent-ledger"
            sheetName="Rent Ledger"
          />
        )}
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => openAdd('PAYMENT')}
              className="rounded-full border border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.12)] px-3 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-[rgba(34,197,94,0.2)]"
            >
              + Add Payment
            </button>
            <button
              type="button"
              onClick={() => openAdd('RENT_CHARGE')}
              className="rounded-full border border-zinc-300 bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
            >
              + Add Charge
            </button>
          </>
        )}
      </div>
    </div>
  );

  // ── Add modal ──
  const addModalEl =
    modal?.mode === 'add' ? (
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => {
          if (!pending) setModal(null);
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      >
        <form
          onClick={(e) => e.stopPropagation()}
          onSubmit={submitAdd}
          className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.9)] p-6 shadow-2xl backdrop-blur-xl"
        >
          <h2 className="text-lg font-semibold tracking-tight text-white">
            {modal.type === 'PAYMENT' ? 'Add Payment' : 'Add Charge'}
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-date" className={labelClass}>
                Date
              </label>
              <input
                id="le-date"
                name="date"
                type="date"
                required
                defaultValue={today()}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-rentfor" className={labelClass}>
                Rent For{' '}
                <span className="text-xs text-[#6A6A8A]">
                  (which period this covers)
                </span>
              </label>
              <input
                id="le-rentfor"
                name="rentFor"
                type="date"
                defaultValue={today()}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-amt" className={labelClass}>
                Amount (₹)
              </label>
              <input
                id="le-amt"
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                placeholder="40000"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-desc" className={labelClass}>
                Description
              </label>
              <input
                id="le-desc"
                name="description"
                type="text"
                required
                placeholder={
                  modal.type === 'PAYMENT' ? 'Payment received' : 'Rent - Month YYYY'
                }
                className={inputClass}
              />
            </div>
          </div>
          {formError && (
            <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {formError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (!pending) setModal(null);
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
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    ) : null;

  // ── Edit modal ──
  const isAdjustment = editType === 'ADJUSTMENT';
  const editModalEl =
    modal?.mode === 'edit' ? (
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => {
          if (!pending) setModal(null);
        }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      >
        <form
          onClick={(e) => e.stopPropagation()}
          onSubmit={submitEdit}
          className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.9)] p-6 shadow-2xl backdrop-blur-xl"
        >
          <h2 className="text-lg font-semibold tracking-tight text-white">
            Edit Entry
          </h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-type" className={labelClass}>
                Type
              </label>
              <select
                id="le-type"
                name="type"
                value={editType}
                onChange={(e) => setEditType(e.target.value as LedgerEntryType)}
                className={inputClass}
              >
                <option value="RENT_CHARGE">Charge</option>
                <option value="PAYMENT">Payment</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-date" className={labelClass}>
                Date
              </label>
              <input
                id="le-date"
                name="date"
                type="date"
                required
                defaultValue={modal.entry.date.slice(0, 10)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-rentfor" className={labelClass}>
                Rent For{' '}
                <span className="text-xs text-[#6A6A8A]">
                  (which period this covers)
                </span>
              </label>
              <input
                id="le-rentfor"
                name="rentFor"
                type="date"
                // Blank when unset (don't silently backfill a legacy entry's
                // rentFor on an unrelated edit) — matches the RentLedger editor.
                defaultValue={modal.entry.rentFor?.slice(0, 10) ?? ''}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-amt" className={labelClass}>
                Amount (₹)
                {isAdjustment && (
                  <span className="ml-1 text-xs text-[#6A6A8A]">
                    (negative = increases what tenant owes)
                  </span>
                )}
              </label>
              <input
                id="le-amt"
                name="amount"
                type="number"
                step="1"
                {...(isAdjustment ? {} : { min: '1' })}
                required
                defaultValue={
                  isAdjustment ? modal.entry.amount : Math.abs(modal.entry.amount)
                }
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-desc" className={labelClass}>
                Description
              </label>
              <input
                id="le-desc"
                name="description"
                type="text"
                required
                defaultValue={modal.entry.description}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="le-reason" className={labelClass}>
                Reason for change{' '}
                <span className="text-xs text-[#6A6A8A]">(optional)</span>
              </label>
              <input
                id="le-reason"
                name="reason"
                type="text"
                placeholder="e.g. corrected a typo"
                className={inputClass}
              />
            </div>
          </div>
          {formError && (
            <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {formError}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                if (!pending) setModal(null);
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
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    ) : null;

  const modalEl = (
    <>
      {addModalEl}
      {editModalEl}
    </>
  );

  if (entries === null) {
    return (
      <>
        {renderHeader()}
        <p className="px-1 py-3 text-sm text-[#B0B0C8]">Loading ledger…</p>
        {modalEl}
      </>
    );
  }

  if (loadError) {
    return (
      <>
        {renderHeader()}
        <p className="px-1 py-3 text-sm text-red-400">{loadError}</p>
        {modalEl}
      </>
    );
  }

  // Summaries + running balance (entries arrive oldest-first).
  const totalCharged = entries
    .filter((e) => e.amount < 0)
    .reduce((s, e) => s + Math.abs(e.amount), 0);
  const totalPaid = entries
    .filter((e) => e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);
  const currentBalance = entries.reduce((s, e) => s + e.amount, 0);

  const rows: (LedgerEntry & { running: number })[] = [];
  entries.reduce((sum, e) => {
    const running = sum + e.amount;
    rows.push({ ...e, running });
    return running;
  }, 0);

  const owes = currentBalance < 0;

  const exportRows: ExportRow[] = rows.map((e) => ({
    Date: dmyFmt.format(new Date(e.date)),
    'Rent For': e.rentFor ? dmyFmt.format(new Date(e.rentFor)) : '',
    Type: TYPE_BADGE[e.type].label,
    Description: e.description,
    Amount: e.amount,
    'Running Balance': e.running,
  }));

  return (
    <>
      {renderHeader(exportRows)}

      {/* Summary cards */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-[#100d24] p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Current Balance
          </p>
          <p
            className={
              'mt-1 text-xl font-bold ' + (owes ? 'text-red-400' : 'text-green-400')
            }
          >
            {formatMoney(Math.abs(currentBalance))}
          </p>
          <p className="mt-0.5 text-xs text-[#6A6A8A]">
            {owes ? 'Outstanding (tenant owes)' : 'Settled / in credit'}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-[#100d24] p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Total Charged
          </p>
          <p className="mt-1 text-xl font-bold text-[#E8A020]">
            {formatMoney(totalCharged)}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-[#100d24] p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Total Paid
          </p>
          <p className="mt-1 text-xl font-bold text-green-400">
            {formatMoney(totalPaid)}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-1 py-3 text-sm text-[#B0B0C8]">
          No ledger entries yet. Add a charge or payment to get started.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Rent For</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-right font-medium">Running Balance</th>
                <th className="px-3 py-2 text-right font-medium">History</th>
                {canEdit && (
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((e) => {
                const badge = TYPE_BADGE[e.type];
                const isCredit = e.amount > 0;
                return (
                  <tr
                    key={e.id}
                    className="transition-colors hover:bg-zinc-50"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-white">
                      {dmyFmt.format(new Date(e.date))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                      {e.rentFor ? dmyFmt.format(new Date(e.rentFor)) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          'inline-block rounded-full border px-2 py-0.5 text-xs font-medium ' +
                          badge.cls
                        }
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-500">{e.description}</td>
                    <td
                      className={
                        'whitespace-nowrap px-3 py-2 text-right font-medium ' +
                        (isCredit ? 'text-green-400' : 'text-red-400')
                      }
                    >
                      {isCredit ? '+' : '−'}
                      {formatMoney(Math.abs(e.amount))}
                    </td>
                    <td
                      className={
                        'whitespace-nowrap px-3 py-2 text-right font-medium ' +
                        (e.running < 0 ? 'text-red-400' : 'text-white')
                      }
                    >
                      {e.running < 0 ? '−' : ''}
                      {formatMoney(Math.abs(e.running))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <AuditHistoryPopover entity="LEDGER_ENTRY" entityId={e.id} />
                    </td>
                    {canEdit && (
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(e)}
                            disabled={pending}
                            className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-2.5 py-1 text-xs text-[#B0B0C8] transition-colors hover:text-white disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEntry(e)}
                            disabled={pending}
                            className="rounded-full border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] px-2.5 py-1 text-xs text-red-400 transition-colors hover:bg-[rgba(239,68,68,0.2)] disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {modalEl}
    </>
  );
}
