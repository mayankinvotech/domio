// Pure, client-safe property-type/status helpers (no Prisma runtime import).
import type { PropertyType, PropertyStatus } from '@prisma/client';

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'RESIDENTIAL', label: 'Residential' },
  { value: 'COMMERCIAL', label: 'Commercial' },
  { value: 'MIXED', label: 'Mixed' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
];

export const PROPERTY_STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'VACANT', label: 'Vacant' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
];

const TYPE_LABELS: Record<PropertyType, string> = {
  RESIDENTIAL: 'Residential',
  COMMERCIAL: 'Commercial',
  MIXED: 'Mixed',
  INDUSTRIAL: 'Industrial',
};

const STATUS_LABELS: Record<PropertyStatus, string> = {
  ACTIVE: 'Active',
  VACANT: 'Vacant',
  MAINTENANCE: 'Maintenance',
};

// AverIQ brand badge classes — lavender for RESIDENTIAL/COMMERCIAL,
// gold for MIXED, muted for INDUSTRIAL.
const TYPE_BADGE: Record<PropertyType, string> = {
  RESIDENTIAL: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
  COMMERCIAL: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
  MIXED:
    'border border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.12)] text-[#E8A020]',
  INDUSTRIAL: 'border border-[#312D58] bg-[rgba(255,255,255,0.06)] text-[#E8E8F2]',
};

// Status badges — ACTIVE lavender, VACANT gold, MAINTENANCE red.
const STATUS_BADGE: Record<PropertyStatus, string> = {
  ACTIVE: 'border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 text-[#8B6FE8]',
  VACANT:
    'border border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.12)] text-[#E8A020]',
  MAINTENANCE: 'border border-red-500/30 bg-red-500/10 text-red-400',
};

export function propertyTypeLabel(type: PropertyType): string {
  return TYPE_LABELS[type];
}

export function propertyStatusLabel(status: PropertyStatus): string {
  return STATUS_LABELS[status];
}

export function propertyTypeBadgeClass(type: PropertyType): string {
  return TYPE_BADGE[type];
}

export function propertyStatusBadgeClass(status: PropertyStatus): string {
  return STATUS_BADGE[status];
}

export function isPropertyType(value: unknown): value is PropertyType {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(TYPE_LABELS, value)
  );
}

export function isPropertyStatus(value: unknown): value is PropertyStatus {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(STATUS_LABELS, value)
  );
}
