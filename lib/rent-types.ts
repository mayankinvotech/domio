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
  PAID: 'border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold',
  DUE: 'border border-amber-200 bg-amber-50 text-amber-800 font-semibold',
  OVERDUE: 'border border-red-200 bg-red-50 text-red-700 font-semibold',
  PARTIAL: 'border border-purple-200 bg-purple-50 text-purple-700 font-semibold',
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
