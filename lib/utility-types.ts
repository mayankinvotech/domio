// Pure, client-safe utility helpers (no Prisma runtime import).
import type { UtilityType, BillStatus } from '@prisma/client';

export const UTILITY_TYPES: {
  value: UtilityType;
  label: string;
  icon: string;
}[] = [
  { value: 'ELECTRICITY', label: 'Electricity', icon: '⚡' },
  { value: 'WATER', label: 'Water', icon: '💧' },
  { value: 'GAS', label: 'Gas', icon: '🔥' },
  { value: 'INTERNET', label: 'Internet', icon: '🌐' },
  { value: 'OTHER', label: 'Other', icon: '🧾' },
];

const TYPE_LABELS: Record<UtilityType, string> = {
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  GAS: 'Gas',
  INTERNET: 'Internet',
  OTHER: 'Other',
};

const TYPE_ICONS: Record<UtilityType, string> = {
  ELECTRICITY: '⚡',
  WATER: '💧',
  GAS: '🔥',
  INTERNET: '🌐',
  OTHER: '🧾',
};

export function utilityTypeLabel(t: UtilityType): string {
  return TYPE_LABELS[t];
}
export function utilityTypeIcon(t: UtilityType): string {
  return TYPE_ICONS[t];
}
export function isUtilityType(value: unknown): value is UtilityType {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(TYPE_LABELS, value)
  );
}

// Account level (utility accounts link to a portfolio, property, or unit).
export type UtilityLevel = 'PORTFOLIO' | 'PROPERTY' | 'UNIT';
export const UTILITY_LEVELS: { value: UtilityLevel; label: string }[] = [
  { value: 'PORTFOLIO', label: 'Portfolio Level' },
  { value: 'PROPERTY', label: 'Property Level' },
  { value: 'UNIT', label: 'Unit Level' },
];
export function isUtilityLevel(value: unknown): value is UtilityLevel {
  return value === 'PORTFOLIO' || value === 'PROPERTY' || value === 'UNIT';
}

// ── Bill status ──────────────────────────────────────────────────────────────

export const BILL_STATUSES: { value: BillStatus; label: string }[] = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PAID', label: 'Paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PARTIAL', label: 'Partial' },
];

const STATUS_LABELS: Record<BillStatus, string> = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  PARTIAL: 'Partial',
};

const STATUS_BADGE: Record<BillStatus, string> = {
  PAID: 'border border-green-500/30 bg-green-500/10 text-green-400',
  UNPAID:
    'border border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.12)] text-[#E8A020]',
  OVERDUE: 'border border-red-500/30 bg-red-500/10 text-red-400',
  PARTIAL: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
};

export function billStatusLabel(s: BillStatus): string {
  return STATUS_LABELS[s];
}
export function billStatusBadgeClass(s: BillStatus): string {
  return STATUS_BADGE[s];
}
export function isBillStatus(value: unknown): value is BillStatus {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(STATUS_LABELS, value)
  );
}
