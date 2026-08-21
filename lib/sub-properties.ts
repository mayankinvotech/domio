import type { SubPropertyStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isSubPropertyStatus } from '@/lib/sub-property-types';

export type ParsedUnit = {
  name: string;
  unitNumber: string;
  floor: string | null;
  areaSqft: number | null;
  rentAmount: number;
  status: SubPropertyStatus;
  notes: string | null;
};

// Validate + coerce a unit request body (shared by POST and PATCH).
export function parseUnitInput(
  body: unknown,
): { data: ParsedUnit } | { error: string } {
  const { name, unitNumber, floor, areaSqft, rentAmount, status, notes } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Name is required.' };
  }
  if (typeof unitNumber !== 'string' || !unitNumber.trim()) {
    return { error: 'Unit number is required.' };
  }
  if (!isSubPropertyStatus(status)) {
    return { error: 'A valid status is required.' };
  }

  const rent = typeof rentAmount === 'number' ? rentAmount : Number(rentAmount);
  if (!Number.isFinite(rent) || rent < 0) {
    return { error: 'A valid rent amount is required.' };
  }

  let area: number | null = null;
  if (areaSqft !== undefined && areaSqft !== null && areaSqft !== '') {
    const a = typeof areaSqft === 'number' ? areaSqft : Number(areaSqft);
    if (!Number.isFinite(a) || a < 0) {
      return { error: 'Area must be a valid number.' };
    }
    area = a;
  }

  return {
    data: {
      name: name.trim(),
      unitNumber: unitNumber.trim(),
      floor: typeof floor === 'string' && floor.trim() ? floor.trim() : null,
      areaSqft: area,
      rentAmount: rent,
      status,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    },
  };
}

export type SubPropertyListItem = {
  id: string;
  name: string;
  unitNumber: string;
  floor: string | null;
  areaSqft: number | null;
  rentAmount: number;
  status: SubPropertyStatus;
  notes: string | null;
  currentTenantName: string | null;
};

const listSelect = {
  id: true,
  name: true,
  unitNumber: true,
  floor: true,
  areaSqft: true,
  rentAmount: true,
  status: true,
  notes: true,
  // The active tenancy's tenant (if any) → "current tenant".
  tenancies: {
    where: { status: 'ACTIVE' as const },
    orderBy: { startDate: 'desc' as const },
    take: 1,
    select: { tenant: { select: { name: true } } },
  },
} as const;

type SubPropertyRow = {
  id: string;
  name: string;
  unitNumber: string;
  floor: string | null;
  areaSqft: number | null;
  rentAmount: number;
  status: SubPropertyStatus;
  notes: string | null;
  tenancies: { tenant: { name: string } }[];
};

function toListItem({ tenancies, ...rest }: SubPropertyRow): SubPropertyListItem {
  return { ...rest, currentTenantName: tenancies[0]?.tenant.name ?? null };
}

// Units in one property, scoped to the owner, newest first.
export async function listSubPropertiesForProperty(
  propertyId: string,
  ownerId: string,
): Promise<SubPropertyListItem[]> {
  const rows = await prisma.subProperty.findMany({
    where: { propertyId, ownerId },
    orderBy: { createdAt: 'desc' },
    select: listSelect,
  });
  return rows.map(toListItem);
}

// All of an owner's units, optionally filtered by property.
// `scope` (managers) restricts to the given accessible unit ids.
export async function listSubPropertiesForOwner(
  ownerId: string,
  propertyId?: string,
  scope?: { subPropertyIds: string[] },
): Promise<SubPropertyListItem[]> {
  const rows = await prisma.subProperty.findMany({
    where: {
      ownerId,
      ...(propertyId ? { propertyId } : {}),
      ...(scope ? { id: { in: scope.subPropertyIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: listSelect,
  });
  return rows.map(toListItem);
}

// A single unit, only if it belongs to the given owner (else null).
export async function getOwnedSubProperty(id: string, ownerId: string) {
  const unit = await prisma.subProperty.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      unitNumber: true,
      floor: true,
      areaSqft: true,
      rentAmount: true,
      status: true,
      notes: true,
      propertyId: true,
      ownerId: true,
    },
  });
  if (!unit || unit.ownerId !== ownerId) return null;
  return unit;
}
