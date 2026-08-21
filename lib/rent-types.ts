// Pure, client-safe rent-status helpers (no Prisma runtime import).
import type { RentStatus } from '@prisma/client';

export const RENT_STATUSES: { value: RentStatus; label: string }[] = [
  { value: 'DUE', label: 'Due' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'OVERDUE', label: 'Overdue' },
];

const STATUS_LABELS: Record<RentStatus, string> = {
  DUE: 'Due',
  PAID: 'Paid',
  PARTIAL: 'Partial',
  OVERDUE: 'Overdue',
};

// AverIQ-aligned badges — PAID green, DUE gold, OVERDUE red, PARTIAL violet.
const STATUS_BADGE: Record<RentStatus, string> = {
  PAID: 'border border-green-500/30 bg-green-500/10 text-green-400',
  DUE: 'border border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.12)] text-[#E8A020]',
  OVERDUE: 'border border-red-500/30 bg-red-500/10 text-red-400',
  PARTIAL: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
};

export function rentStatusLabel(status: RentStatus): string {
  return STATUS_LABELS[status];
}

export function rentStatusBadgeClass(status: RentStatus): string {
  return STATUS_BADGE[status];
}

export function isRentStatus(value: unknown): value is RentStatus {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(STATUS_LABELS, value)
  );
}
