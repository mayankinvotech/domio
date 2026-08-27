/**
 * lib/rentable-entities.ts
 *
 * Server-side business logic for the variable-granularity rental hierarchy.
 * A RentableEntity tree looks like:
 *
 *   Property (whole building)
 *     └─ Floor 1
 *         ├─ Room 1A
 *         │    ├─ Bed A
 *         │    └─ Bed B
 *         └─ Room 1B
 *
 * Leases (Tenancy rows) can be attached to ANY node in the tree.
 * Conflict rules — enforced via recursive PostgreSQL CTEs:
 *   - Cannot lease a node if an ANCESTOR already has an active overlapping lease.
 *   - Cannot lease a node if any DESCENDANT already has an active overlapping lease.
 *
 * Rent aggregation — also via CTE:
 *   - "Total rent" for a node = own active lease rent + all descendant active rents.
 */

import type { RentableEntityType, SubPropertyStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isSubPropertyStatus } from '@/lib/sub-property-types';

// ── Type helpers ─────────────────────────────────────────────────────────────

const RENTABLE_ENTITY_TYPES: RentableEntityType[] = [
  'PROPERTY',
  'FLOOR',
  'ROOM',
  'OFFICE',
  'BED',
];

export function isRentableEntityType(v: unknown): v is RentableEntityType {
  return typeof v === 'string' && (RENTABLE_ENTITY_TYPES as string[]).includes(v);
}

export const RENTABLE_ENTITY_TYPE_LABELS: Record<RentableEntityType, string> = {
  PROPERTY: 'Whole Property',
  FLOOR: 'Floor',
  ROOM: 'Room',
  OFFICE: 'Office',
  BED: 'Bed',
};

// Flexible Hierarchy — Valid Parent -> Child Relationships:
// - FLOOR: Property only (floors always hang directly off a property)
// - ROOM: Property or Floor (skip floor -> room hangs directly off property)
// - OFFICE: Property or Floor (same skip-level flexibility as Room)
// - BED: Room or Floor (floor -> bed skips room entirely for dorm/hostel style)
// - PROPERTY: none (top-level portfolio child)
export const VALID_PARENT_TYPES: Record<RentableEntityType, RentableEntityType[]> = {
  PROPERTY: [],
  FLOOR: ['PROPERTY'],
  ROOM: ['PROPERTY', 'FLOOR'],
  OFFICE: ['PROPERTY', 'FLOOR'],
  BED: ['ROOM', 'FLOOR'],
};

// ── Input parsing ─────────────────────────────────────────────────────────────

export type ParsedRentableEntity = {
  type: RentableEntityType;
  name: string;
  code: string;
  parentId: string | null;
  areaSqft: number | null;
  rentAmount: number;
  status: SubPropertyStatus;
  notes: string | null;
  sortOrder: number | null;
};

export function parseRentableEntityInput(
  body: unknown,
): { data: ParsedRentableEntity } | { error: string } {
  const {
    type,
    name,
    code,
    parentId,
    areaSqft,
    rentAmount,
    status,
    notes,
    sortOrder,
  } = (body ?? {}) as Record<string, unknown>;

  if (!isRentableEntityType(type)) {
    return { error: 'A valid entity type (PROPERTY/FLOOR/ROOM/BED) is required.' };
  }
  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Name is required.' };
  }
  if (typeof code !== 'string' || !code.trim()) {
    return { error: 'A short code/identifier is required.' };
  }

  // parentId: required for FLOOR, ROOM, BED; must be null/absent for PROPERTY.
  const validParentTypes = VALID_PARENT_TYPES[type];
  const resolvedParentId =
    typeof parentId === 'string' && parentId.trim() ? parentId.trim() : null;

  if (validParentTypes.length > 0 && !resolvedParentId) {
    return { error: `A parent entity is required for type ${type}.` };
  }
  if (validParentTypes.length === 0 && resolvedParentId) {
    return { error: 'A PROPERTY-type entity cannot have a parent.' };
  }

  // rentAmount
  const rent = typeof rentAmount === 'number' ? rentAmount : Number(rentAmount);
  if (!Number.isFinite(rent) || rent < 0) {
    return { error: 'A valid rent amount is required.' };
  }

  // areaSqft (optional)
  let area: number | null = null;
  if (areaSqft !== undefined && areaSqft !== null && areaSqft !== '') {
    const a = typeof areaSqft === 'number' ? areaSqft : Number(areaSqft);
    if (!Number.isFinite(a) || a < 0) {
      return { error: 'Area must be a valid positive number.' };
    }
    area = a;
  }

  // status
  const resolvedStatus: SubPropertyStatus = isSubPropertyStatus(status)
    ? status
    : 'VACANT';

  // sortOrder (optional)
  let order: number | null = null;
  if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
    const o = typeof sortOrder === 'number' ? sortOrder : Number(sortOrder);
    if (Number.isInteger(o)) order = o;
  }

  return {
    data: {
      type,
      name: name.trim(),
      code: code.trim(),
      parentId: resolvedParentId,
      areaSqft: area,
      rentAmount: rent,
      status: resolvedStatus,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      sortOrder: order,
    },
  };
}

// ── Tree types ────────────────────────────────────────────────────────────────

export type RentableEntityNode = {
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
  propertyId: string;
  // Lease info for this node (active tenancy, if any)
  activeLease: {
    tenancyId: string;
    tenantName: string;
    monthlyRent: number;
    startDate: Date;
    endDate: Date;
  } | null;
  // Aggregated rent from this node + all descendants
  aggregatedRent: number;
  // Aggregated collection (amount paid) from this node + all descendants
  aggregatedCollection: number;
  children: RentableEntityNode[];
};

// ── Database queries ──────────────────────────────────────────────────────────

/** Flat list of all RentableEntity rows for a property, newest first. */
export async function listRentableEntitiesForProperty(
  propertyId: string,
  ownerId: string,
): Promise<RentableEntityNode[]> {
  const rows = await prisma.rentableEntity.findMany({
    where: { propertyId, ownerId },
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
          startDate: true,
          endDate: true,
          tenant: { select: { name: true } },
          rentLedger: {
            select: { amountPaid: true },
          },
        },
      },
    },
  });

  // Build tree + compute aggregated rent & collections in JS
  return buildTree(rows);
}

type FlatRow = {
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
  propertyId: string;
  tenancies: {
    id: string;
    monthlyRent: number;
    startDate: Date;
    endDate: Date;
    tenant: { name: string };
    rentLedger: { amountPaid: number }[];
  }[];
};

function buildTree(rows: FlatRow[]): RentableEntityNode[] {
  const nodeMap = new Map<string, RentableEntityNode & { directCollection: number }>();

  // First pass: create all nodes
  for (const row of rows) {
    const lease = row.tenancies[0] ?? null;
    const directColl = lease
      ? lease.rentLedger.reduce((sum, item) => sum + item.amountPaid, 0)
      : 0;

    nodeMap.set(row.id, {
      id: row.id,
      displayId: row.displayId,
      type: row.type,
      name: row.name,
      code: row.code,
      areaSqft: row.areaSqft,
      rentAmount: row.rentAmount,
      status: row.status,
      notes: row.notes,
      sortOrder: row.sortOrder,
      parentId: row.parentId,
      propertyId: row.propertyId,
      activeLease: lease
        ? {
            tenancyId: lease.id,
            tenantName: lease.tenant.name,
            monthlyRent: lease.monthlyRent,
            startDate: lease.startDate,
            endDate: lease.endDate,
          }
        : null,
      aggregatedRent: lease?.monthlyRent ?? 0, // will be summed bottom-up
      aggregatedCollection: directColl, // will be summed bottom-up
      directCollection: directColl,
      children: [],
    });
  }

  // Second pass: wire up children
  const roots: RentableEntityNode[] = [];
  for (const [, node] of nodeMap) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Third pass: compute aggregated rent and collection bottom-up
  function aggregateNode(node: RentableEntityNode & { directCollection: number }): {
    rent: number;
    collection: number;
  } {
    let childRentSum = 0;
    let childCollSum = 0;
    for (const child of node.children) {
      const res = aggregateNode(child as RentableEntityNode & { directCollection: number });
      childRentSum += res.rent;
      childCollSum += res.collection;
    }

    node.aggregatedRent = (node.activeLease?.monthlyRent ?? 0) + childRentSum;
    node.aggregatedCollection = node.directCollection + childCollSum;
    return { rent: node.aggregatedRent, collection: node.aggregatedCollection };
  }

  for (const root of roots) {
    aggregateNode(root as RentableEntityNode & { directCollection: number });
  }

  return roots;
}

// ── Ownership-scoped single-node fetch ────────────────────────────────────────

export async function getOwnedRentableEntity(id: string, ownerId: string) {
  const entity = await prisma.rentableEntity.findUnique({
    where: { id },
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
      ownerId: true,
    },
  });
  if (!entity || entity.ownerId !== ownerId) return null;
  return entity;
}

// ── Conflict detection (recursive CTEs) ──────────────────────────────────────
//
// All three queries run a single round-trip. They use the parentId index that
// Prisma created in the migration.

type ConflictRow = { id: string }[];

/**
 * Returns the ID of the first conflicting ancestor tenancy found, or null.
 * "Conflict" = an ACTIVE tenancy on any ancestor of `nodeId` that overlaps
 * the requested [startDate, endDate] window.
 */
export async function checkAncestorLeaseConflict(
  nodeId: string,
  startDate: Date,
  endDate: Date,
): Promise<string | null> {
  const result = await prisma.$queryRaw<ConflictRow>`
    WITH RECURSIVE ancestors AS (
      SELECT id, "parentId"
      FROM "RentableEntity"
      WHERE id = ${nodeId}
      UNION ALL
      SELECT re.id, re."parentId"
      FROM "RentableEntity" re
      INNER JOIN ancestors a ON re.id = a."parentId"
    )
    SELECT t.id
    FROM "Tenancy" t
    INNER JOIN ancestors a ON t."rentableEntityId" = a.id
    WHERE t.status = 'ACTIVE'
      AND t."startDate" <= ${endDate}
      AND t."endDate"   >= ${startDate}
      AND a.id <> ${nodeId}
    LIMIT 1
  `;
  return result[0]?.id ?? null;
}

/**
 * Returns the ID of the first conflicting descendant tenancy found, or null.
 * "Conflict" = an ACTIVE tenancy on any descendant of `nodeId` that overlaps
 * the requested [startDate, endDate] window.
 */
export async function checkDescendantLeaseConflict(
  nodeId: string,
  startDate: Date,
  endDate: Date,
): Promise<string | null> {
  const result = await prisma.$queryRaw<ConflictRow>`
    WITH RECURSIVE descendants AS (
      SELECT id
      FROM "RentableEntity"
      WHERE id = ${nodeId}
      UNION ALL
      SELECT re.id
      FROM "RentableEntity" re
      INNER JOIN descendants d ON re."parentId" = d.id
    )
    SELECT t.id
    FROM "Tenancy" t
    INNER JOIN descendants d ON t."rentableEntityId" = d.id
    WHERE t.status = 'ACTIVE'
      AND t."startDate" <= ${endDate}
      AND t."endDate"   >= ${startDate}
      AND d.id <> ${nodeId}
    LIMIT 1
  `;
  return result[0]?.id ?? null;
}

// ── Rent aggregation ──────────────────────────────────────────────────────────

export type RentAggregation = {
  totalMonthlyRent: number;
  activeLeaseCount: number;
};

/**
 * Returns total monthly rent for a node = sum of active lease rents on the
 * node itself PLUS all its descendants. Single CTE query.
 */
export async function aggregateRentForNode(
  nodeId: string,
): Promise<RentAggregation> {
  type AggRow = { total_monthly_rent: number | null; active_lease_count: bigint };
  const result = await prisma.$queryRaw<AggRow[]>`
    WITH RECURSIVE subtree AS (
      SELECT id
      FROM "RentableEntity"
      WHERE id = ${nodeId}
      UNION ALL
      SELECT re.id
      FROM "RentableEntity" re
      INNER JOIN subtree s ON re."parentId" = s.id
    )
    SELECT
      SUM(t."monthlyRent")::float AS total_monthly_rent,
      COUNT(t.id)                 AS active_lease_count
    FROM "Tenancy" t
    INNER JOIN subtree s ON t."rentableEntityId" = s.id
    WHERE t.status = 'ACTIVE'
  `;
  const row = result[0];
  return {
    totalMonthlyRent: row?.total_monthly_rent ?? 0,
    activeLeaseCount: row ? Number(row.active_lease_count) : 0,
  };
}

// ── Tenancy input parsing (extended) ─────────────────────────────────────────

export type ParsedRentableEntityTenancy = {
  rentableEntityId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  paymentDayOfMonth: number;
};

function toDate(v: unknown): Date | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseRentableEntityTenancyInput(
  body: unknown,
): { data: ParsedRentableEntityTenancy } | { error: string } {
  const { rentableEntityId, startDate, endDate, monthlyRent, securityDeposit, paymentDayOfMonth } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof rentableEntityId !== 'string' || !rentableEntityId) {
    return { error: 'A rentable entity is required.' };
  }

  const start = toDate(startDate);
  const end = toDate(endDate);
  if (!start) return { error: 'A valid start date is required.' };
  if (!end) return { error: 'A valid end date is required.' };
  if (end <= start) return { error: 'End date must be after the start date.' };

  const rent =
    typeof monthlyRent === 'number' ? monthlyRent : Number(monthlyRent);
  if (!Number.isFinite(rent) || rent < 0) {
    return { error: 'A valid monthly rent is required.' };
  }

  let deposit = 0;
  if (securityDeposit !== undefined && securityDeposit !== null && securityDeposit !== '') {
    deposit =
      typeof securityDeposit === 'number' ? securityDeposit : Number(securityDeposit);
    if (!Number.isFinite(deposit) || deposit < 0) {
      return { error: 'Security deposit must be a valid number.' };
    }
  }

  const day =
    typeof paymentDayOfMonth === 'number' ? paymentDayOfMonth : Number(paymentDayOfMonth);
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    return { error: 'Payment day must be a whole number between 1 and 28.' };
  }

  return {
    data: { rentableEntityId, startDate: start, endDate: end, monthlyRent: rent, securityDeposit: deposit, paymentDayOfMonth: day },
  };
}
