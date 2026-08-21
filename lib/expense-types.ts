// Pure, client-safe expense helpers (no Prisma runtime import).
import type { ExpenseCategory } from '@prisma/client';

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'TAX', label: 'Tax' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'MANAGEMENT', label: 'Management' },
  { value: 'OTHER', label: 'Other' },
];

export type ExpenseLevel = 'PORTFOLIO' | 'PROPERTY' | 'UNIT';

export const EXPENSE_LEVELS: { value: ExpenseLevel; label: string }[] = [
  { value: 'PORTFOLIO', label: 'Portfolio' },
  { value: 'PROPERTY', label: 'Property' },
  { value: 'UNIT', label: 'Unit' },
];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  MAINTENANCE: 'Maintenance',
  CLEANING: 'Cleaning',
  INSURANCE: 'Insurance',
  TAX: 'Tax',
  LEGAL: 'Legal',
  UTILITIES: 'Utilities',
  MANAGEMENT: 'Management',
  OTHER: 'Other',
};

// Distinct, color-coded badges — brand violet/lavender/gold lead, with tasteful
// semantic tints for the remaining categories.
const CATEGORY_BADGE: Record<ExpenseCategory, string> = {
  MAINTENANCE:
    'border border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.12)] text-[#E8A020]',
  CLEANING: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
  INSURANCE: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  TAX: 'border border-red-500/30 bg-red-500/10 text-red-400',
  LEGAL: 'border border-blue-500/30 bg-blue-500/10 text-blue-400',
  UTILITIES: 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  MANAGEMENT: 'border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400',
  OTHER: 'border border-[#312D58] bg-[rgba(255,255,255,0.06)] text-[#B0B0C8]',
};

export function expenseCategoryLabel(category: ExpenseCategory): string {
  return CATEGORY_LABELS[category];
}

export function expenseCategoryBadgeClass(category: ExpenseCategory): string {
  return CATEGORY_BADGE[category];
}

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, value)
  );
}

export function isExpenseLevel(value: unknown): value is ExpenseLevel {
  return value === 'PORTFOLIO' || value === 'PROPERTY' || value === 'UNIT';
}
