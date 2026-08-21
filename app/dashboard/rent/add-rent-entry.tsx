'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import type { ActiveTenancyOption } from '@/lib/rent-ledger';

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

function thisMonth() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export default function AddRentEntry({
  tenancies,
}: {
  tenancies: ActiveTenancyOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled fields so we can prefill amount from the chosen tenancy and the
  // due date from the chosen month.
  const [tenancyId, setTenancyId] = useState('');
  const [month, setMonth] = useState(thisMonth());
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(`${thisMonth()}-01`);

  // Lock scroll + close on Escape while the modal is open.
  useScrollLock(open);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, pending]); // eslint-disable-line react-hooks/exhaustive-deps

  function reset() {
    setTenancyId('');
    setMonth(thisMonth());
    setAmount('');
    setDueDate(`${thisMonth()}-01`);
    setError(null);
  }

  function close() {
    if (pending) return;
    setOpen(false);
    reset();
  }

  function onTenancyChange(id: string) {
    setTenancyId(id);
    const t = tenancies.find((x) => x.tenancyId === id);
    if (t) setAmount(String(t.monthlyRent));
  }

  function onMonthChange(value: string) {
    setMonth(value);
    // Default the due date to the 1st of the chosen month for convenience.
    if (value) setDueDate(`${value}-01`);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenancyId) {
      setError('Please select a tenant.');
      return;
    }
    setPending(true);
    setError(null);
    const res = await fetch('/api/rent-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenancyId, dueDate, amountDue: amount }),
    });
    if (res.ok) {
      setOpen(false);
      reset();
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? 'Failed to add entry. Please try again.');
    }
    setPending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-zinc-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
      >
        Add Rent Entry
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSubmit}
            className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Add Rent Entry
            </h2>
            <p className="mt-1 mb-4 text-sm text-[#B0B0C8]">
              Manually create a rent entry for an active tenancy.
            </p>

            {tenancies.length === 0 ? (
              <p className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#B0B0C8]">
                No active tenancies to add an entry for.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tenancy" className={labelClass}>
                    Tenant
                  </label>
                  <select
                    id="tenancy"
                    value={tenancyId}
                    onChange={(e) => onTenancyChange(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a tenant…</option>
                    {tenancies.map((t) => (
                      <option key={t.tenancyId} value={t.tenancyId}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="month" className={labelClass}>
                    Month / Year
                  </label>
                  <input
                    id="month"
                    type="month"
                    value={month}
                    onChange={(e) => onMonthChange(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="amount" className={labelClass}>
                      Amount Due
                    </label>
                    <input
                      id="amount"
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="dueDate" className={labelClass}>
                      Due Date
                    </label>
                    <input
                      id="dueDate"
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

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
                onClick={close}
                disabled={pending}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || tenancies.length === 0}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
