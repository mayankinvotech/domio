// Pure, client-safe tenancy helpers (no Prisma runtime import).
import type { TenancyStatus } from '@prisma/client';

export const TENANCY_STATUSES: { value: TenancyStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'TERMINATED', label: 'Terminated' },
];

const STATUS_LABELS: Record<TenancyStatus, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
};

// AverIQ brand badges — ACTIVE lavender, EXPIRED muted, TERMINATED red.
const STATUS_BADGE: Record<TenancyStatus, string> = {
  ACTIVE: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
  EXPIRED:
    'border border-[#312D58] bg-[rgba(255,255,255,0.06)] text-[#B0B0C8]',
  TERMINATED: 'border border-red-500/30 bg-red-500/10 text-red-400',
};

export function tenancyStatusLabel(status: TenancyStatus): string {
  return STATUS_LABELS[status];
}

export function tenancyStatusBadgeClass(status: TenancyStatus): string {
  return STATUS_BADGE[status];
}

export function isTenancyStatus(value: unknown): value is TenancyStatus {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(STATUS_LABELS, value)
  );
}

const moneyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function formatMoney(amount: number): string {
  return moneyFmt.format(amount);
}

export function formatDate(date: Date | string): string {
  return dateFmt.format(new Date(date));
}
