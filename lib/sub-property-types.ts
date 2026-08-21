// Pure, client-safe sub-property (unit) status helpers (no Prisma runtime import).
import type { SubPropertyStatus } from '@prisma/client';

export const SUB_PROPERTY_STATUSES: { value: SubPropertyStatus; label: string }[] =
  [
    { value: 'OCCUPIED', label: 'Occupied' },
    { value: 'VACANT', label: 'Vacant' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
  ];

const STATUS_LABELS: Record<SubPropertyStatus, string> = {
  OCCUPIED: 'Occupied',
  VACANT: 'Vacant',
  MAINTENANCE: 'Maintenance',
};

// AverIQ brand badges — OCCUPIED lavender, VACANT gold, MAINTENANCE red.
const STATUS_BADGE: Record<SubPropertyStatus, string> = {
  OCCUPIED: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
  VACANT:
    'border border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.12)] text-[#E8A020]',
  MAINTENANCE: 'border border-red-500/30 bg-red-500/10 text-red-400',
};

export function subPropertyStatusLabel(status: SubPropertyStatus): string {
  return STATUS_LABELS[status];
}

export function subPropertyStatusBadgeClass(status: SubPropertyStatus): string {
  return STATUS_BADGE[status];
}

export function isSubPropertyStatus(value: unknown): value is SubPropertyStatus {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(STATUS_LABELS, value)
  );
}

// Display helpers for nullable/number fields.
export function formatRent(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatArea(areaSqft: number | null): string {
  return areaSqft == null ? '—' : `${areaSqft.toLocaleString('en-US')} sqft`;
}
