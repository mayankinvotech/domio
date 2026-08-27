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

// Domio brand badge classes per type.
const TYPE_BADGE: Record<PropertyType, string> = {
  RESIDENTIAL: 'border border-blue-200 bg-blue-50 text-blue-700',
  COMMERCIAL: 'border border-indigo-200 bg-indigo-50 text-indigo-700',
  MIXED: 'border border-purple-200 bg-purple-50 text-purple-700',
  INDUSTRIAL: 'border border-amber-200 bg-amber-50 text-amber-800',
};

// Status badges — ACTIVE emerald, VACANT amber, MAINTENANCE rose.
const STATUS_BADGE: Record<PropertyStatus, string> = {
  ACTIVE: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
  VACANT: 'border border-amber-200 bg-amber-50 text-amber-700',
  MAINTENANCE: 'border border-rose-200 bg-rose-50 text-rose-700',
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
