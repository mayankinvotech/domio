'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export type LeaseBannerState = 'vacant' | 'active' | 'expiring' | 'expired';

const STYLES: Record<LeaseBannerState, string> = {
  active:
    'border-[rgba(91,79,232,0.3)] bg-[rgba(91,79,232,0.1)] text-[#8B6FE8]',
  expiring:
    'border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.1)] text-[#E8A020]',
  expired: 'border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.1)] text-red-400',
  vacant:
    'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#B0B0C8]',
};

export default function LeaseBanner({
  state,
  tenantName,
  startDate,
  endDate,
  daysRemaining,
  assignHref,
}: {
  state: LeaseBannerState;
  tenantName: string | null;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number;
  assignHref: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={
        'flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-sm font-medium ' +
        STYLES[state]
      }
    >
      {state === 'vacant' ? (
        <>
          <span>Vacant — no active lease. Click to assign a tenant.</span>
          <Link
            href={assignHref}
            className="min-h-[44px] rounded-full border border-[#8B6FE8]/50 bg-[#5B4FE8] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#4A3FD0]"
          >
            Assign Tenant
          </Link>
        </>
      ) : state === 'expired' ? (
        <span>
          🚨 Lease EXPIRED · {tenantName} · Ended {endDate} · Please renew or
          terminate
        </span>
      ) : state === 'expiring' ? (
        <span>
          ⚠️ Lease expiring soon · {tenantName} · {daysRemaining} days remaining
        </span>
      ) : (
        <span>
          Leased to {tenantName} · {startDate} → {endDate} · {daysRemaining} days
          remaining
        </span>
      )}
    </motion.div>
  );
}
