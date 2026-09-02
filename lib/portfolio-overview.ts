import type {
  PortfolioType,
  PropertyType,
  PropertyStatus,
  SubPropertyStatus,
  RentableEntityType,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Rich, owner-scoped portfolio → property → unit overview powering the
// portfolios accordion page and the property slide-in panel. A single nested
// query; all rent stats are computed in JS from the active tenancy's ledger.

const DAY_MS = 1000 * 60 * 60 * 24;

export type OverviewUnit = {
  id: string;
  displayId: string | null;
  unitNumber: string;
  name: string;
  status: SubPropertyStatus;
  rentAmount: number;
  floor: string | null;
  sortOrder: number | null;
  notes: string | null;
  tenancyId: string | null;
  tenantId: string | null;
  tenantName: string | null;
  leaseEndDate: string | null; // ISO
  daysRemaining: number | null; // to lease end
  expiringSoon: boolean; // 0..60 days remaining
  monthlyExpected: number;
  monthlyCollected: number;
  currentBalance: number; // LedgerEntry running balance (negative = owed)
  overdueAmount: number;
  daysOverdue: number | null;
  overdueEntryId: string | null; // oldest overdue ledger entry (for Pay Now)
};

// ── RentableEntity tree types (for hierarchy display) ──────────────────────────

export type OverviewEntityNode = {
  id: string;
  displayId: string | null;
  type: RentableEntityType;
  name: string;
  code: string;
  areaSqft: number | null;
  // The price listed when this entity was registered
  listedRent: number;
  status: SubPropertyStatus;
  notes: string | null;
  sortOrder: number | null;
  parentId: string | null;
  // Whether this is a leaf node (no children). Only leaf nodes can be
  // assigned tenants or shown as "Vacant". Parent containers are structural.
  isLeaf: boolean;
  // Active lease on this exact node (if any)
  activeLease: {
    tenancyId: string;
    tenantName: string;
    monthlyRent: number;
    endDate: Date;
  } | null;
  // Effective rent for this node used in rollup:
  //   - If this node has children → sum of children's effectiveRent
  //   - If leaf node → activeLease.monthlyRent ?? listedRent
  effectiveRent: number;
  children: OverviewEntityNode[];
};

export type OverviewProperty = {
  id: string;
  displayId: string | null;
  name: string;
  address: string;
  city: string;
  country: string;
  status: PropertyStatus;
  type: PropertyType;
  unitCount: number;
  occupiedCount: number;
  monthlyExpected: number;
  monthlyCollected: number;
  overdueCount: number;
  expiringCount: number;
  documentCount: number;
  managerName: string | null;
  unitsExpanded: boolean;
  unitsGroupBy: string;
  unitSections: UnitSection[] | null;
  units: OverviewUnit[];
  // Hierarchical RentableEntity tree (may be empty if property uses flat SubProperty only)
  rentableEntities: OverviewEntityNode[];
};

export type UnitSection = { id: string; label: string; unitIds: string[] };

export type OverviewPortfolio = {
  id: string;
  displayId: string | null;
  name: string;
  type: PortfolioType;
  description: string | null;
  propertyCount: number;
  unitCount: number;
  occupiedCount: number;
  monthlyExpected: number;
  monthlyCollected: number;
  overdueCount: number;
  expiringCount: number;
  properties: OverviewProperty[];
};

type LedgerRow = {
  id: string;
  dueDate: Date;
  amountDue: number;
  amountPaid: number;
  paidDate: Date | null;
  status: string;
};

// An entry counts as overdue if its due date has passed and a balance remains
// (regardless of whether a sweep has flipped its status yet).
function isOverdue(l: LedgerRow, now: Date): boolean {
  return (
    l.dueDate < now &&
    l.amountDue - l.amountPaid > 0.001 &&
    l.status !== 'PAID'
  );
}

// ── RentableEntity tree builder ────────────────────────────────────────────────

type FlatEntityRow = {
  id: string;
  displayId: string | null;
  type: RentableEntityType;
  name: string;
  code: string;
  areaSqft: number | null;
  rentAmount: number;
  status: SubPropertyStatus;
  notes: string | null;
  sortOrder: number | null;
  parentId: string | null;
  tenancies: {
    id: string;
    monthlyRent: number;
    endDate: Date;
    tenant: { name: string };
  }[];
};

/**
 * Build a tree from flat rows, then compute bottom-up effectiveRent:
 *   - Leaf node: effectiveRent = activeLease.monthlyRent ?? listedRent
 *   - Parent node: effectiveRent = sum of children effectiveRent
 *     (we IGNORE the parent's own listedRent when it has children — per user requirement)
 */
function buildEntityTree(rows: FlatEntityRow[]): OverviewEntityNode[] {
  // First pass: create all nodes (isLeaf computed in second pass after wiring children)
  const nodeMap = new Map<string, OverviewEntityNode>();
  for (const row of rows) {
    const lease = row.tenancies[0] ?? null;
    nodeMap.set(row.id, {
      id: row.id,
      displayId: row.displayId,
      type: row.type,
      name: row.name,
      code: row.code,
      areaSqft: row.areaSqft,
      listedRent: row.rentAmount,
      status: row.status,
      notes: row.notes,
      sortOrder: row.sortOrder,
      parentId: row.parentId,
      isLeaf: true, // updated after children are wired
      activeLease: lease
        ? {
            tenancyId: lease.id,
            tenantName: lease.tenant.name,
            monthlyRent: lease.monthlyRent,
            endDate: lease.endDate,
          }
        : null,
      effectiveRent: 0, // computed in third pass
      children: [],
    });
  }

  // Second pass: wire parent–child relationships, then mark non-leaf parents
  const roots: OverviewEntityNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId)!;
      parent.children.push(node);
      // Parent nodes are structural containers, not rentable leaf units
      parent.isLeaf = false;
    } else {
      roots.push(node);
    }
  }

  // Sort children by sortOrder then name
  function sortChildren(node: OverviewEntityNode) {
    node.children.sort((a, b) => {
      if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
      if (a.sortOrder != null) return -1;
      if (b.sortOrder != null) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const child of node.children) sortChildren(child);
  }
  roots.sort((a, b) => {
    if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
    if (a.sortOrder != null) return -1;
    if (b.sortOrder != null) return 1;
    return a.name.localeCompare(b.name);
  });
  for (const root of roots) sortChildren(root);

  // Third pass: bottom-up effectiveRent
  function computeEffectiveRent(node: OverviewEntityNode): number {
    if (node.children.length === 0) {
      // Leaf: use active lease rent, or the listed price
      node.effectiveRent = node.activeLease?.monthlyRent ?? node.listedRent;
    } else {
      // Parent: sum children only (ignore own listed rent when children exist)
      let childSum = 0;
      for (const child of node.children) {
        childSum += computeEffectiveRent(child);
      }
      node.effectiveRent = childSum;
    }
    return node.effectiveRent;
  }
  for (const root of roots) computeEffectiveRent(root);

  return roots;
}

/**
 * Recursively sum the effectiveRent of all root-level entities.
 * This gives the total monthly expected rent for a property's RentableEntity hierarchy.
 */
function sumEntityRoots(roots: OverviewEntityNode[]): number {
  return roots.reduce((sum, n) => sum + n.effectiveRent, 0);
}

/**
 * Count occupied LEAF entity nodes only.
 * Parent containers (floors, rooms with sub-units) are NOT counted.
 */
function countOccupiedEntities(nodes: OverviewEntityNode[]): number {
  let count = 0;
  for (const node of nodes) {
    // Only leaf nodes count as occupiable units
    if (node.isLeaf && node.status === 'OCCUPIED') count++;
    count += countOccupiedEntities(node.children);
  }
  return count;
}

/**
 * Count total LEAF entity nodes at all levels.
 * Parent containers (floors, rooms with sub-units) are NOT counted
 * because only leaf units can be rented and assigned tenants.
 */
function countAllEntities(nodes: OverviewEntityNode[]): number {
  let count = 0;
  for (const node of nodes) {
    // Only leaf nodes count as rentable units
    if (node.isLeaf) count++;
    count += countAllEntities(node.children);
  }
  return count;
}

export async function getPortfolioOverview(
  ownerId: string,
  // Manager scope: restrict to accessible property/unit ids.
  scope?: { propertyIds: string[]; subPropertyIds: string[] },
): Promise<OverviewPortfolio[]> {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  const [portfolios, docCountRows, managerRows, paymentRows, balanceRows, entityRows] =
    await Promise.all([
    prisma.portfolio.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      displayId: true,
      name: true,
      type: true,
      description: true,
      properties: {
        where: scope ? { id: { in: scope.propertyIds } } : undefined,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayId: true,
          name: true,
          address: true,
          city: true,
          country: true,
          status: true,
          type: true,
          unitsExpanded: true,
          unitsGroupBy: true,
          unitSections: true,
          subProperties: {
            where: scope ? { id: { in: scope.subPropertyIds } } : undefined,
            orderBy: [{ sortOrder: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
            select: {
              id: true,
              displayId: true,
              name: true,
              unitNumber: true,
              status: true,
              rentAmount: true,
              floor: true,
              sortOrder: true,
              notes: true,
              tenancies: {
                where: { status: 'ACTIVE' },
                orderBy: { startDate: 'desc' },
                take: 1,
                select: {
                  id: true,
                  endDate: true,
                  monthlyRent: true,
                  tenant: { select: { id: true, name: true } },
                  rentLedger: {
                    select: {
                      id: true,
                      dueDate: true,
                      amountDue: true,
                      amountPaid: true,
                      paidDate: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    }),
    prisma.document.groupBy({
      by: ['entityId'],
      where: { ownerId, entityType: 'PROPERTY' },
      _count: true,
    }),
    prisma.propertyAccess.findMany({
      where: { ownerId, propertyId: { not: null } },
      select: { propertyId: true, manager: { select: { name: true } } },
    }),
    // Current-month rent collected per tenancy = sum of PAYMENT ledger entries.
    prisma.ledgerEntry.groupBy({
      by: ['tenancyId'],
      where: {
        type: 'PAYMENT',
        date: { gte: monthStart, lt: monthEnd },
        tenancy: scope
          ? { ownerId, subPropertyId: { in: scope.subPropertyIds } }
          : { ownerId },
      },
      _sum: { amount: true },
    }),
    // All-time balance per tenancy = sum of every LedgerEntry amount (signed).
    prisma.ledgerEntry.groupBy({
      by: ['tenancyId'],
      where: {
        tenancy: scope
          ? { ownerId, subPropertyId: { in: scope.subPropertyIds } }
          : { ownerId },
      },
      _sum: { amount: true },
    }),
    // RentableEntity hierarchy for all properties owned by this user.
    prisma.rentableEntity.findMany({
      where: scope
        ? { ownerId, propertyId: { in: scope.propertyIds } }
        : { ownerId },
      orderBy: [
        { sortOrder: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
      select: {
        id: true,
        displayId: true,
        type: true,
        name: true,
        code: true,
        areaSqft: true,
        rentAmount: true,
        status: true,
        notes: true,
        sortOrder: true,
        parentId: true,
        propertyId: true,
        tenancies: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
          select: {
            id: true,
            monthlyRent: true,
            endDate: true,
            tenant: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  // Rent collected this month, keyed by tenancy id (LedgerEntry PAYMENTs).
  const paidByTenancy = new Map<string, number>(
    paymentRows.map((r) => [r.tenancyId, r._sum.amount ?? 0]),
  );
  // Current running balance, keyed by tenancy id (negative = owed).
  const balanceByTenancy = new Map<string, number>(
    balanceRows.map((r) => [r.tenancyId, r._sum.amount ?? 0]),
  );

  // Document counts keyed by property id.
  const docCounts = new Map<string, number>(
    docCountRows.map((r) => [r.entityId, r._count]),
  );
  // Assigned manager (first property-level grant) keyed by property id.
  const managerByProperty = new Map<string, string>();
  for (const a of managerRows) {
    if (a.propertyId && !managerByProperty.has(a.propertyId)) {
      managerByProperty.set(a.propertyId, a.manager.name);
    }
  }

  // Group RentableEntity rows by propertyId, then build trees.
  const entityRowsByProperty = new Map<string, typeof entityRows>();
  for (const row of entityRows) {
    if (!entityRowsByProperty.has(row.propertyId)) {
      entityRowsByProperty.set(row.propertyId, []);
    }
    entityRowsByProperty.get(row.propertyId)!.push(row);
  }

  const mapped = portfolios.map((p) => {
    const properties: OverviewProperty[] = p.properties.map((pr) => {
      // ── SubProperty (flat) units ──────────────────────────────────────────
      const units: OverviewUnit[] = pr.subProperties.map((u) => {
        const tenancy = u.tenancies[0] ?? null;
        const ledger = (tenancy?.rentLedger ?? []) as LedgerRow[];

        const overdueEntries = ledger
          .filter((l) => isOverdue(l, now))
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        const overdueAmount = overdueEntries.reduce(
          (s, l) => s + (l.amountDue - l.amountPaid),
          0,
        );
        const oldestOverdue = overdueEntries[0] ?? null;
        const daysOverdue = oldestOverdue
          ? Math.max(
              0,
              Math.floor((now.getTime() - oldestOverdue.dueDate.getTime()) / DAY_MS),
            )
          : null;

        const monthlyCollected = tenancy
          ? paidByTenancy.get(tenancy.id) ?? 0
          : 0;
        const currentBalance = tenancy
          ? balanceByTenancy.get(tenancy.id) ?? 0
          : 0;

        const daysRemaining = tenancy
          ? Math.ceil((tenancy.endDate.getTime() - now.getTime()) / DAY_MS)
          : null;
        const expiringSoon =
          daysRemaining != null && daysRemaining >= 0 && daysRemaining <= 60;

        const monthlyExpected = tenancy ? tenancy.monthlyRent : 0;

        return {
          id: u.id,
          displayId: u.displayId,
          unitNumber: u.unitNumber,
          name: u.name,
          status: u.status,
          rentAmount: u.rentAmount,
          floor: u.floor,
          sortOrder: u.sortOrder,
          notes: u.notes,
          tenancyId: tenancy?.id ?? null,
          tenantId: tenancy?.tenant.id ?? null,
          tenantName: tenancy?.tenant.name ?? null,
          leaseEndDate: tenancy ? tenancy.endDate.toISOString() : null,
          daysRemaining,
          expiringSoon,
          monthlyExpected,
          monthlyCollected,
          currentBalance,
          overdueAmount,
          daysOverdue,
          overdueEntryId: oldestOverdue?.id ?? null,
        };
      });

      // ── RentableEntity hierarchy tree ──────────────────────────────────────
      const rawEntityRows = entityRowsByProperty.get(pr.id) ?? [];
      const rentableEntities = buildEntityTree(rawEntityRows);

      // ── Monthly expected rent calculation ─────────────────────────────────
      // Priority: if RentableEntity hierarchy exists → use its leaf-sum rollup.
      // Otherwise fall back to SubProperty unit sum.
      const entityExpected = rentableEntities.length > 0
        ? sumEntityRoots(rentableEntities)
        : 0;
      const subPropExpected = units.reduce((s, u) => s + u.monthlyExpected, 0);
      const monthlyExpected = entityExpected + subPropExpected;

      const hasHierarchy = rentableEntities.length > 0;
      const entityCount = hasHierarchy ? countAllEntities(rentableEntities) : 0;
      const entityOccupied = hasHierarchy ? countOccupiedEntities(rentableEntities) : 0;

      return {
        id: pr.id,
        displayId: pr.displayId,
        name: pr.name,
        address: pr.address,
        city: pr.city,
        country: pr.country,
        status: pr.status,
        type: pr.type,
        // When a RentableEntity hierarchy exists, count ONLY leaf entity nodes.
        // Flat SubProperty units are still tracked in `units` for display/ledger,
        // but they should NOT inflate the unit count when a hierarchy takes precedence.
        unitCount: hasHierarchy ? entityCount : units.length,
        occupiedCount: hasHierarchy
          ? entityOccupied
          : units.filter((u) => u.status === 'OCCUPIED').length,
        monthlyExpected,
        monthlyCollected: units.reduce((s, u) => s + u.monthlyCollected, 0),
        overdueCount: units.filter((u) => u.overdueAmount > 0).length,
        expiringCount: units.filter((u) => u.expiringSoon).length,
        documentCount: docCounts.get(pr.id) ?? 0,
        managerName: managerByProperty.get(pr.id) ?? null,
        unitsExpanded: pr.unitsExpanded,
        unitsGroupBy: pr.unitsGroupBy,
        unitSections: (pr.unitSections as UnitSection[] | null) ?? null,
        units,
        rentableEntities,
      };
    });

    return {
      id: p.id,
      displayId: p.displayId,
      name: p.name,
      type: p.type,
      description: p.description,
      propertyCount: properties.length,
      unitCount: properties.reduce((s, pr) => s + pr.unitCount, 0),
      occupiedCount: properties.reduce((s, pr) => s + pr.occupiedCount, 0),
      monthlyExpected: properties.reduce((s, pr) => s + pr.monthlyExpected, 0),
      monthlyCollected: properties.reduce((s, pr) => s + pr.monthlyCollected, 0),
      overdueCount: properties.reduce((s, pr) => s + pr.overdueCount, 0),
      expiringCount: properties.reduce((s, pr) => s + pr.expiringCount, 0),
      properties,
    };
  });

  // Managers shouldn't see portfolios where they have no accessible properties.
  return scope ? mapped.filter((p) => p.propertyCount > 0) : mapped;
}
