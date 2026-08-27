// Pure, client-safe portfolio-type helpers (no Prisma import) so client
// components can use labels/badges/options. Type-only import of PortfolioType
// keeps @prisma/client out of the client bundle.
import type { PortfolioType } from '@prisma/client';

// Dropdown options + display labels for each portfolio type.
export const PORTFOLIO_TYPES: { value: PortfolioType; label: string }[] = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
];

const TYPE_LABELS: Record<PortfolioType, string> = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
  MIXED: 'Mixed',
  INDUSTRIAL: 'Industrial',
};

// Domio brand badge classes per type.
const TYPE_BADGE: Record<PortfolioType, string> = {
  RESIDENTIAL: 'border border-blue-200 bg-blue-50 text-blue-700',
  COMMERCIAL: 'border border-indigo-200 bg-indigo-50 text-indigo-700',
  MIXED: 'border border-purple-200 bg-purple-50 text-purple-700',
  INDUSTRIAL: 'border border-amber-200 bg-amber-50 text-amber-800',
};

export function portfolioTypeLabel(type: PortfolioType): string {
  return TYPE_LABELS[type];
}

export function portfolioTypeBadgeClass(type: PortfolioType): string {
  return TYPE_BADGE[type];
}

export function isPortfolioType(value: unknown): value is PortfolioType {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(TYPE_LABELS, value)
  );
}
