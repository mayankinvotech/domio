'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatMoney } from '@/lib/tenancy-types';
import { utilityTypeLabel } from '@/lib/utility-types';
import type { DashboardData } from '@/lib/dashboard';

type Item = {
  key: string;
  dot: string;
  body: React.ReactNode;
  action: { label: string; href: string };
};

const actionClass =
  'shrink-0 rounded-full border border-[#71717a]/40 bg-zinc-900/15 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-900/25';

export default function AlertsTimeline({
  alerts,
}: {
  alerts: DashboardData['alerts'];
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const items: Item[] = [
    ...alerts.overdue.map((a) => ({
      key: `o-${a.entryId ?? a.href}`,
      dot: 'bg-red-500',
      body: (
        <span>
          <span className="font-medium text-white">{a.tenantName}</span>
          <span className="text-[#6A6A8A]"> · {a.unitLabel} · </span>
          <span className="font-medium text-red-400">
            {formatMoney(a.amount)} overdue
          </span>
          <span className="text-[#6A6A8A]"> · {a.daysOverdue}d</span>
        </span>
      ),
      action: { label: 'Record Payment →', href: '/dashboard/rent' },
    })),
    ...alerts.expiring.map((a) => ({
      key: `e-${a.tenancyId}`,
      dot: 'bg-[#E8A020]',
      body: (
        <span>
          <span className="font-medium text-white">{a.tenantName}</span>
          <span className="text-[#6A6A8A]"> · {a.unitLabel} · </span>
          <span className="text-[#E8A020]">
            Lease expiring in {a.daysRemaining}d
          </span>
        </span>
      ),
      action: { label: 'View Unit →', href: a.href },
    })),
    ...alerts.vacant.map((a) => ({
      key: `v-${a.unitId}`,
      dot: 'bg-[#E8A020]',
      body: (
        <span>
          <span className="font-medium text-white">{a.unitLabel}</span>
          <span className="text-[#6A6A8A]"> · {a.propertyName} · Vacant · </span>
          <span className="text-[#E8E8F2]">{formatMoney(a.rent)}/mo potential</span>
        </span>
      ),
      action: { label: 'Assign Tenant →', href: a.href },
    })),
    ...alerts.utility.map((a) => ({
      key: `u-${a.billId}`,
      dot: 'bg-orange-500',
      body: (
        <span>
          <span className="font-medium text-white">
            {utilityTypeLabel(a.type)}
          </span>
          <span className="text-[#6A6A8A]"> · {a.propertyName} · </span>
          <span className="text-orange-400">{formatMoney(a.amount)} due</span>
        </span>
      ),
      action: { label: 'View Bill →', href: '/dashboard/utilities' },
    })),
    ...alerts.document.map((a) => ({
      key: `d-${a.id}`,
      dot: 'bg-zinc-400',
      body: (
        <span>
          📄 <span className="font-medium text-white">{a.name}</span>
          <span className="text-[#6A6A8A]"> · {a.entityLabel} · </span>
          <span className="text-zinc-500">
            expires in {a.daysRemaining} days
          </span>
        </span>
      ),
      action: { label: 'View →', href: '/dashboard/documents' },
    })),
  ].filter((i) => !dismissed.has(i.key));

  return (
    <section className="mt-8">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        Needs Attention
      </h2>

      {items.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm font-medium text-zinc-500">
          ✅ Everything looks good — no items need attention
        </div>
      ) : (
        <>
          <ul className="relative mt-4 space-y-1 border-l border-[#1A1A2A] pl-6">
            <AnimatePresence initial={false}>
              {(showAll ? items : items.slice(0, 5)).map((it) => (
                <motion.li
                  key={it.key}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative flex items-center justify-between gap-3 py-2"
                >
                  <span
                    className={
                      'absolute -left-[1.625rem] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ring-4 ring-[#0A0A0F] ' +
                      it.dot
                    }
                  />
                  <div className="min-w-0 flex-1 text-sm">{it.body}</div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={it.action.href} className={actionClass}>
                      {it.action.label}
                    </Link>
                    <button
                      type="button"
                      aria-label="Dismiss"
                      onClick={() =>
                        setDismissed((prev) => new Set(prev).add(it.key))
                      }
                      className="rounded-full px-1.5 text-sm text-[#4A4A6A] transition-colors hover:text-[#B0B0C8]"
                    >
                      ✕
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {items.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-2 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
            >
              {showAll
                ? 'Show fewer'
                : `View all ${items.length} alerts →`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
