'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatMoney } from '@/lib/tenancy-types';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { Button, ButtonLink } from '@/components/ui/button';
import {
  propertyStatusLabel,
  propertyTypeLabel,
} from '@/lib/property-types';
import type { OverviewProperty, OverviewUnit } from '@/lib/portfolio-overview';

const inputClass =
  'w-full rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Resolve a unit's visual state → emoji + border/bg classes.
function unitStyle(u: OverviewUnit): {
  emoji: string;
  cls: string;
} {
  if (u.status === 'MAINTENANCE')
    return {
      emoji: '🟠',
      cls: 'border-[rgba(249,115,22,0.5)] bg-[rgba(249,115,22,0.08)]',
    };
  if (u.status === 'VACANT')
    return { emoji: '⚪', cls: 'border-[#1A1A2A] bg-[rgba(255,255,255,0.02)]' };
  if (u.overdueAmount > 0)
    return {
      emoji: '🔴',
      cls: 'border-[rgba(239,68,68,0.5)] bg-[rgba(239,68,68,0.08)]',
    };
  if (u.expiringSoon)
    return {
      emoji: '🟡',
      cls: 'border-[rgba(232,160,32,0.5)] bg-[rgba(232,160,32,0.08)]',
    };
  return {
    emoji: '🟢',
    cls: 'border-zinc-200 bg-zinc-50',
  };
}

export default function PropertySlidePanel({
  open,
  portfolioId,
  property,
  onClose,
}: {
  open: boolean;
  portfolioId: string;
  property: OverviewProperty | null;
  onClose: () => void;
}) {
  // Retain last property so the exit animation has something to render.
  const [cached, setCached] = useState<OverviewProperty | null>(property);
  const [payUnit, setPayUnit] = useState<OverviewUnit | null>(null);

  useEffect(() => {
    if (property) setCached(property);
  }, [property]);

  useScrollLock(open);
  const trapRef = useFocusTrap<HTMLElement>(open);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const p = cached;
  const base = p
    ? `/dashboard/portfolios/${portfolioId}/properties/${p.id}`
    : '';
  const occupancy =
    p && p.unitCount > 0
      ? Math.round((p.occupiedCount / p.unitCount) * 100)
      : 0;

  return (
    <AnimatePresence>
      {open && p && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />
          <motion.aside
            key="panel"
            ref={trapRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto border-l border-[#312D58] bg-[#0E0C22] shadow-2xl sm:max-w-md"
          >
            {/* Header */}
            <div className="border-b border-[#1A1A2A] p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  {p.name}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                >
                  ✕ Close
                </Button>
              </div>
              <p className="mt-1 text-xs text-[#6A6A8A]">
                {propertyTypeLabel(p.type)} · {propertyStatusLabel(p.status)}
              </p>
              <p className="text-xs text-[#6A6A8A]">
                {p.address}, {p.city}
              </p>

              {/* Stats */}
              <div className="mt-4 space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-[#6A6A8A]">
                    <span>Occupancy {p.occupiedCount}/{p.unitCount}</span>
                    <span>{occupancy}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#1A1A2A]">
                    <motion.div
                      className="h-full rounded-full bg-zinc-900"
                      initial={{ width: 0 }}
                      animate={{ width: `${occupancy}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
                <p className="text-sm text-[#E8E8F2]">
                  Rent{' '}
                  <span className="font-semibold text-zinc-500">
                    {formatMoney(p.monthlyCollected)}
                  </span>{' '}
                  collected /{' '}
                  <span className="font-semibold text-[#E8A020]">
                    {formatMoney(p.monthlyExpected)}
                  </span>{' '}
                  expected
                </p>
              </div>
            </div>

            {/* Units */}
            <div className="flex-1 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Units
                </h3>
                <Link
                  href={`${base}/units/new`}
                  className="rounded-full border border-zinc-200 bg-zinc-900/15 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-900/25"
                >
                  + Add Unit
                </Link>
              </div>

              {p.units.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-10 text-center">
                  <div className="text-4xl">🚪</div>
                  <p className="mt-3 text-sm font-medium text-white">
                    No units added yet
                  </p>
                  <Link
                    href={`${base}/units/new`}
                    className="mt-4 inline-flex rounded-full border border-zinc-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                  >
                    + Add Unit
                  </Link>
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {p.units.map((u) => (
                      <UnitCard
                        key={u.id}
                        unit={u}
                        detailHref={`${base}/units/${u.id}`}
                        onPay={() => setPayUnit(u)}
                      />
                    ))}
                  </div>

                  <div className="mt-5 text-[11px] leading-relaxed text-[#6A6A8A]">
                    <span className="mr-3">🟢 Healthy</span>
                    <span className="mr-3">🔴 Overdue</span>
                    <span className="mr-3">⚪ Vacant</span>
                    <span className="mr-3">🟡 Expiring</span>
                    <span>🟠 Maintenance</span>
                  </div>
                </>
              )}
            </div>
          </motion.aside>

          {payUnit && (
            <PayNowModal
              unit={payUnit}
              onClose={() => setPayUnit(null)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}

function UnitCard({
  unit,
  detailHref,
  onPay,
}: {
  unit: OverviewUnit;
  detailHref: string;
  onPay: () => void;
}) {
  const { emoji, cls } = unitStyle(unit);
  const overdue = unit.overdueAmount > 0;
  const vacant = unit.status === 'VACANT';

  return (
    <div
      className={
        'flex flex-col rounded-xl border p-3 transition-all duration-150 hover:-translate-y-0.5 ' +
        cls
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white">
          Unit {unit.unitNumber}
        </span>
        <span aria-hidden className="text-xs">
          {emoji}
        </span>
      </div>
      {unit.displayId && (
        <p className="font-mono text-[10px] text-[#4A4A6A]">{unit.displayId}</p>
      )}
      <p className="mt-1 truncate text-xs text-[#E8E8F2]">
        {vacant
          ? 'Vacant'
          : unit.status === 'MAINTENANCE'
            ? 'Maintenance'
            : (unit.tenantName ?? 'Occupied')}
      </p>
      <p className="text-xs text-[#6A6A8A]">{formatMoney(unit.rentAmount)}/mo</p>
      <p className="mt-0.5 text-[11px]">
        {overdue ? (
          <span className="text-red-400">
            {formatMoney(unit.overdueAmount)} · {unit.daysOverdue} days overdue
          </span>
        ) : unit.daysRemaining != null && !vacant ? (
          <span className="text-[#6A6A8A]">
            {unit.daysRemaining} days remaining
          </span>
        ) : (
          <span>&nbsp;</span>
        )}
      </p>

      {(overdue || vacant) && (
        <div className="mt-2">
          {overdue ? (
            <Button
              variant="danger"
              size="sm"
              onClick={onPay}
              className="w-full"
            >
              Pay Now
            </Button>
          ) : (
            <ButtonLink
              href="/dashboard/tenants"
              variant="ghost"
              size="sm"
              className="w-full"
            >
              Assign Tenant
            </ButtonLink>
          )}
        </div>
      )}

      {/* View Detail → at the bottom right of every unit card. */}
      <div className="mt-2 flex justify-end">
        <ButtonLink href={detailHref} variant="ghost" size="sm">
          View Detail →
        </ButtonLink>
      </div>
    </div>
  );
}

function PayNowModal({
  unit,
  onClose,
}: {
  unit: OverviewUnit;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unit.overdueEntryId) {
      setError('No payable ledger entry found.');
      return;
    }
    setPending(true);
    setError(null);
    const d = new FormData(event.currentTarget);
    const res = await fetch(`/api/rent-ledger/${unit.overdueEntryId}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountPaid: d.get('amountPaid'),
        paymentDate: d.get('paymentDate'),
        reference: d.get('reference'),
        notes: d.get('notes'),
      }),
    });
    if (res.ok) {
      onClose();
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? 'Failed to record payment. Please try again.');
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => !pending && onClose()}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Record Payment
        </h2>
        <p className="mt-1 mb-4 text-sm text-[#B0B0C8]">
          Unit {unit.unitNumber} · {formatMoney(unit.overdueAmount)} overdue
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pn-amt" className="text-sm font-medium text-[#E8E8F2]">
              Amount Paid
            </label>
            <input
              id="pn-amt"
              name="amountPaid"
              type="number"
              min="0"
              step="any"
              required
              defaultValue={unit.overdueAmount}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pn-date" className="text-sm font-medium text-[#E8E8F2]">
              Payment Received Date
            </label>
            <input
              id="pn-date"
              name="paymentDate"
              type="date"
              required
              defaultValue={today()}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pn-ref" className="text-sm font-medium text-[#E8E8F2]">
              Reference <span className="text-[#B0B0C8]">(optional)</span>
            </label>
            <input id="pn-ref" name="reference" type="text" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pn-notes" className="text-sm font-medium text-[#E8E8F2]">
              Notes <span className="text-[#B0B0C8]">(optional)</span>
            </label>
            <textarea
              id="pn-notes"
              name="notes"
              rows={2}
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
            onClick={() => !pending && onClose()}
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
  );
}
