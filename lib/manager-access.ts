import { prisma } from '@/lib/prisma';

// Raw granted ids (as stored on PropertyAccess), per the spec helper.
export async function getManagerPropertyIds(managerId: string): Promise<{
  propertyIds: string[];
  subPropertyIds: string[];
}> {
  const access = await prisma.propertyAccess.findMany({
    where: { managerId },
    select: { propertyId: true, subPropertyId: true },
  });
  return {
    propertyIds: access
      .map((a) => a.propertyId)
      .filter((x): x is string => x !== null),
    subPropertyIds: access
      .map((a) => a.subPropertyId)
      .filter((x): x is string => x !== null),
  };
}

export type ManagerScope = {
  ownerId: string; // the owner who created this manager (whose data they read)
  propertyIds: string[]; // accessible properties (incl. parents of unit grants)
  subPropertyIds: string[]; // accessible units (incl. all units under property grants)
  tenantIds: string[]; // tenants with a tenancy in an accessible unit
  editPropertyIds: Set<string>;
  editSubPropertyIds: Set<string>;
  // Rent-ledger edit rights (granted via canEditRentLedger, orthogonal to EDIT).
  rentEditPropertyIds: Set<string>;
  rentEditSubPropertyIds: Set<string>;
};

// Resolve the full effective access for a manager: expands property-level grants
// to their units and unit-level grants to their parent property.
export async function getManagerScope(managerId: string): Promise<ManagerScope> {
  const me = await prisma.user.findUnique({
    where: { id: managerId },
    select: { ownerId: true },
  });
  const ownerId = me?.ownerId ?? '';

  const records = await prisma.propertyAccess.findMany({
    where: { managerId },
    select: {
      propertyId: true,
      subPropertyId: true,
      accessLevel: true,
      canEditRentLedger: true,
    },
  });

  const grantedPropertyIds = records
    .map((r) => r.propertyId)
    .filter((x): x is string => x !== null);
  const grantedUnitIds = records
    .map((r) => r.subPropertyId)
    .filter((x): x is string => x !== null);

  const [unitsUnderProps, parentsOfUnits] = await Promise.all([
    grantedPropertyIds.length
      ? prisma.subProperty.findMany({
          where: { propertyId: { in: grantedPropertyIds } },
          select: { id: true },
        })
      : Promise.resolve([]),
    grantedUnitIds.length
      ? prisma.subProperty.findMany({
          where: { id: { in: grantedUnitIds } },
          select: { propertyId: true },
        })
      : Promise.resolve([]),
  ]);

  const propertyIds = [
    ...new Set([...grantedPropertyIds, ...parentsOfUnits.map((u) => u.propertyId)]),
  ];
  const subPropertyIds = [
    ...new Set([...grantedUnitIds, ...unitsUnderProps.map((u) => u.id)]),
  ];

  // Property-level grants cascade to their child units, for both EDIT and the
  // orthogonal rent-ledger right. Resolve both cascades in one query.
  const editProps = records
    .filter((r) => r.propertyId && r.accessLevel === 'EDIT')
    .map((r) => r.propertyId as string);
  const editUnits = records
    .filter((r) => r.subPropertyId && r.accessLevel === 'EDIT')
    .map((r) => r.subPropertyId as string);
  const rentEditProps = records
    .filter((r) => r.propertyId && r.canEditRentLedger)
    .map((r) => r.propertyId as string);
  const rentEditUnits = records
    .filter((r) => r.subPropertyId && r.canEditRentLedger)
    .map((r) => r.subPropertyId as string);

  const cascadeProps = [...new Set([...editProps, ...rentEditProps])];
  const unitsUnderCascadeProps = cascadeProps.length
    ? await prisma.subProperty.findMany({
        where: { propertyId: { in: cascadeProps } },
        select: { id: true, propertyId: true },
      })
    : [];
  const editPropSet = new Set(editProps);
  const rentEditPropSet = new Set(rentEditProps);
  const unitsUnderEditProps = unitsUnderCascadeProps.filter((u) =>
    editPropSet.has(u.propertyId),
  );
  const unitsUnderRentEditProps = unitsUnderCascadeProps.filter((u) =>
    rentEditPropSet.has(u.propertyId),
  );

  // Tenants of accessible units (for tenant-linked documents).
  const tenancyRows = subPropertyIds.length
    ? await prisma.tenancy.findMany({
        where: { subPropertyId: { in: subPropertyIds } },
        select: { tenantId: true },
      })
    : [];
  const tenantIds = [...new Set(tenancyRows.map((t) => t.tenantId))];

  return {
    ownerId,
    propertyIds,
    subPropertyIds,
    tenantIds,
    editPropertyIds: new Set(editProps),
    editSubPropertyIds: new Set([
      ...editUnits,
      ...unitsUnderEditProps.map((u) => u.id),
    ]),
    rentEditPropertyIds: new Set(rentEditProps),
    rentEditSubPropertyIds: new Set([
      ...rentEditUnits,
      ...unitsUnderRentEditProps.map((u) => u.id),
    ]),
  };
}

// Unified data scope for any authenticated user.
export type DataScope =
  | { isManager: false; ownerId: string }
  | { isManager: true; ownerId: string; scope: ManagerScope };

export async function resolveDataScope(user: {
  id: string;
  role: string;
}): Promise<DataScope> {
  if (user.role === 'MANAGER') {
    const scope = await getManagerScope(user.id);
    return { isManager: true, ownerId: scope.ownerId, scope };
  }
  return { isManager: false, ownerId: user.id };
}

// Minimal id sets used to constrain list queries for managers.
export type ScopeFilter = { propertyIds: string[]; subPropertyIds: string[] };

export function canEditProperty(scope: ManagerScope, propertyId: string): boolean {
  return scope.editPropertyIds.has(propertyId);
}
export function canEditUnit(scope: ManagerScope, subPropertyId: string): boolean {
  return scope.editSubPropertyIds.has(subPropertyId);
}
export function canEditRentLedgerForUnit(
  scope: ManagerScope,
  subPropertyId: string,
): boolean {
  return scope.rentEditSubPropertyIds.has(subPropertyId);
}

// Resolve write access to a property or unit for the current user.
// OWNER → always allowed (their own data). MANAGER → only with EDIT access;
// VIEW-only returns 403, no access returns 404 (avoid leaking existence).
export async function resolveEditAccess(
  user: { id: string; role: string },
  target: { propertyId?: string | null; subPropertyId?: string | null },
): Promise<{ ownerId: string } | { error: string; status: number }> {
  if (user.role === 'OWNER') return { ownerId: user.id };
  if (user.role === 'MANAGER') {
    const scope = await getManagerScope(user.id);
    const canEdit = target.propertyId
      ? scope.editPropertyIds.has(target.propertyId)
      : target.subPropertyId
        ? scope.editSubPropertyIds.has(target.subPropertyId)
        : false;
    if (canEdit) return { ownerId: scope.ownerId };
    const hasView = target.propertyId
      ? scope.propertyIds.includes(target.propertyId)
      : target.subPropertyId
        ? scope.subPropertyIds.includes(target.subPropertyId)
        : false;
    return hasView
      ? { error: 'You have view-only access to this property.', status: 403 }
      : { error: 'Not found.', status: 404 };
  }
  return { error: 'Forbidden', status: 403 };
}

// Resolve rent-ledger write access for the current user. Mirrors
// `resolveEditAccess` but gates on the dedicated rent-ledger right rather than
// the coarse EDIT level. Both rent ledgers hang off a tenancy, so a single
// subPropertyId is all a caller needs (property grants already cascaded to
// units inside getManagerScope). 403 = in scope but not permitted; 404 = not in
// scope (don't leak existence).
export async function resolveRentLedgerAccess(
  user: { id: string; role: string },
  target: { subPropertyId?: string | null },
): Promise<{ ownerId: string } | { error: string; status: number }> {
  if (user.role === 'OWNER') return { ownerId: user.id };
  if (user.role === 'MANAGER') {
    const scope = await getManagerScope(user.id);
    if (target.subPropertyId && scope.rentEditSubPropertyIds.has(target.subPropertyId)) {
      return { ownerId: scope.ownerId };
    }
    const hasView = target.subPropertyId ? scope.subPropertyIds.includes(target.subPropertyId) : false;
    return hasView
      ? {
          error: 'You do not have rent-ledger edit rights for this unit.',
          status: 403,
        }
      : { error: 'Not found.', status: 404 };
  }
  return { error: 'Forbidden', status: 403 };
}
