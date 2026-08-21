import { prisma } from '@/lib/prisma';

export type ManagerListItem = {
  id: string;
  displayId: string | null; // MGR-0001 (stored in accountId)
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  accessCount: number;
};

export type AllManagerListItem = ManagerListItem & {
  ownerName: string;
};

// Every Property Manager in the system (super-admin view), newest first.
export async function listAllManagers(): Promise<AllManagerListItem[]> {
  const rows = await prisma.user.findMany({
    where: { role: 'MANAGER' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      accountId: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      owner: { select: { name: true } },
      _count: { select: { managedAccess: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    displayId: r.accountId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    active: r.active,
    accessCount: r._count.managedAccess,
    ownerName: r.owner?.name ?? '—',
  }));
}

// Managers created by a given owner, newest first.
export async function listManagersForOwner(
  ownerId: string,
): Promise<ManagerListItem[]> {
  const rows = await prisma.user.findMany({
    where: { role: 'MANAGER', ownerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      accountId: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      _count: { select: { managedAccess: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    displayId: r.accountId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    active: r.active,
    accessCount: r._count.managedAccess,
  }));
}

export type ManagerAccessRecord = {
  id: string;
  accessLevel: 'VIEW' | 'EDIT';
  canEditRentLedger: boolean;
  kind: 'PROPERTY' | 'UNIT';
  propertyId: string | null;
  subPropertyId: string | null;
  label: string;
  displayId: string | null;
};

// All property/unit access records for a manager, with resolved labels.
export async function listManagerAccess(
  managerId: string,
): Promise<ManagerAccessRecord[]> {
  const rows = await prisma.propertyAccess.findMany({
    where: { managerId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      accessLevel: true,
      canEditRentLedger: true,
      propertyId: true,
      subPropertyId: true,
      property: { select: { name: true, displayId: true } },
      subProperty: { select: { name: true, unitNumber: true, displayId: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    accessLevel: r.accessLevel,
    canEditRentLedger: r.canEditRentLedger,
    kind: r.subPropertyId ? 'UNIT' : 'PROPERTY',
    propertyId: r.propertyId,
    subPropertyId: r.subPropertyId,
    label: r.subProperty
      ? `Unit ${r.subProperty.unitNumber} — ${r.subProperty.name}`
      : (r.property?.name ?? '—'),
    displayId: r.subProperty?.displayId ?? r.property?.displayId ?? null,
  }));
}

// A single manager that belongs to the given owner (else null).
export async function getOwnedManager(id: string, ownerId: string) {
  const manager = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      accountId: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      role: true,
      ownerId: true,
      aiFullPortfolioRead: true,
    },
  });
  if (!manager || manager.role !== 'MANAGER' || manager.ownerId !== ownerId) {
    return null;
  }
  return manager;
}
