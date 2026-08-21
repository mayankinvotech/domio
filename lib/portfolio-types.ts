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

// AverIQ brand badge classes per type.
// Lavender (violet) for RESIDENTIAL & COMMERCIAL, Gold for MIXED, muted for INDUSTRIAL.
const TYPE_BADGE: Record<PortfolioType, string> = {
  RESIDENTIAL: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
  COMMERCIAL: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
  MIXED:
    'border border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.12)] text-[#E8A020]',
  INDUSTRIAL: 'border border-[#312D58] bg-[rgba(255,255,255,0.06)] text-[#E8E8F2]',
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
