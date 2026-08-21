import { prisma } from '@/lib/prisma';

// Shared shape for an owner row in the UI / API responses.
// Never includes the password hash.
export type OwnerListItem = {
  id: string;
  accountId: string | null;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: Date;
};

// All Property Owners, newest first.
export function listOwners(): Promise<OwnerListItem[]> {
  return prisma.user.findMany({
    where: { role: 'OWNER' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      accountId: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      createdAt: true,
    },
  });
}

export type OwnerDetail = OwnerListItem & {
  updatedAt: Date;
  counts: {
    portfolios: number;
    properties: number;
    units: number;
    tenants: number;
    managers: number;
  };
};

// A single Property Owner with rollup counts, or null if not an owner.
export async function getOwnerDetail(id: string): Promise<OwnerDetail | null> {
  const owner = await prisma.user.findFirst({
    where: { id, role: 'OWNER' },
    select: {
      id: true,
      accountId: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          portfolios: true,
          properties: true,
          subProperties: true,
          tenants: true,
          managers: true,
        },
      },
    },
  });
  if (!owner) return null;
  const { _count, ...rest } = owner;
  return {
    ...rest,
    counts: {
      portfolios: _count.portfolios,
      properties: _count.properties,
      units: _count.subProperties,
      tenants: _count.tenants,
      managers: _count.managers,
    },
  };
}
