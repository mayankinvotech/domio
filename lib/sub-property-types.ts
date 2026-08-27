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

// Domio brand badges — OCCUPIED emerald, VACANT amber, MAINTENANCE rose.
const STATUS_BADGE: Record<SubPropertyStatus, string> = {
  OCCUPIED: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  VACANT: 'border border-amber-200 bg-amber-50 text-amber-700',
  MAINTENANCE: 'border border-rose-200 bg-rose-50 text-rose-700',
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
