import type {
  PropertyType,
  PropertyStatus,
  SubPropertyStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type PropertyListItem = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  type: PropertyType;
  customType?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  status: PropertyStatus;
  notes: string | null;
  unitCount: number;
  occupiedCount: number;
  utilityAccountCount: number;
  units: { id: string; unitNumber: string }[];
};

const listSelect = {
  id: true,
  name: true,
  address: true,
  city: true,
  country: true,
  type: true,
  customType: true,
  ownerName: true,
  ownerEmail: true,
  ownerPhone: true,
  status: true,
  notes: true,
  _count: { select: { subProperties: true, utilityAccounts: true } },
  subProperties: {
    select: { id: true, unitNumber: true, status: true },
    orderBy: { createdAt: 'asc' as const },
  },
} as const;

type PropertyRow = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  type: PropertyType;
  customType?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  status: PropertyStatus;
  notes: string | null;
  _count: { subProperties: number; utilityAccounts: number };
  subProperties: { id: string; unitNumber: string; status: SubPropertyStatus }[];
};

function toListItem({
  _count,
  subProperties,
  ...rest
}: PropertyRow): PropertyListItem {
  return {
    ...rest,
    unitCount: _count.subProperties,
    occupiedCount: subProperties.filter((u) => u.status === 'OCCUPIED').length,
    utilityAccountCount: _count.utilityAccounts,
    units: subProperties.map((u) => ({ id: u.id, unitNumber: u.unitNumber })),
  };
}

// Properties in one portfolio, scoped to the owner, newest first.
export async function listPropertiesForPortfolio(
  portfolioId: string,
  ownerId: string,
  scope?: { propertyIds: string[] },
): Promise<PropertyListItem[]> {
  const rows = await prisma.property.findMany({
    where: {
      portfolioId,
      ownerId,
      ...(scope ? { id: { in: scope.propertyIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: listSelect,
  });
  return rows.map(toListItem);
}

// All of an owner's properties, optionally filtered by portfolio.
// `scope` (managers) restricts to the given accessible property ids.
export async function listPropertiesForOwner(
  ownerId: string,
  portfolioId?: string,
  scope?: { propertyIds: string[] },
): Promise<PropertyListItem[]> {
  const rows = await prisma.property.findMany({
    where: {
      ownerId,
      ...(portfolioId ? { portfolioId } : {}),
      ...(scope ? { id: { in: scope.propertyIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: listSelect,
  });
  return rows.map(toListItem);
}

// A single property, only if it belongs to the given owner (else null).
export async function getOwnedProperty(id: string, ownerId: string) {
  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      country: true,
      type: true,
      status: true,
      notes: true,
      portfolioId: true,
      ownerId: true,
    },
  });
  if (!property || property.ownerId !== ownerId) return null;
  return property;
}
