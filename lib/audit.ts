import { Prisma } from '@prisma/client';
import type { AuditEntity, AuditAction, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// The audit trail for both rent ledgers. Every mutating route funnels through
// `recordAudit`, and it takes a transaction client so the log is written in the
// same transaction as the mutation it describes — never one without the other.
// This is the ONLY module that touches prisma.auditLog, and it only ever
// creates rows (the table is append-only by convention).

export type AuditActor = { id: string; role: Role; name: string };

export type AuditContext = {
  ownerId: string;
  subPropertyId: string;
  tenancyId: string;
};

// The fields we snapshot per entity — the only place this whitelist lives.
const SNAPSHOT_FIELDS: Record<AuditEntity, readonly string[]> = {
  LEDGER_ENTRY: ['type', 'amount', 'date', 'rentFor', 'description'],
  RENT_LEDGER: [
    'dueDate',
    'amountDue',
    'amountPaid',
    'paidDate',
    'rentFor',
    'reference',
    'notes',
    'paymentMethod',
    'status',
  ],
};

// Pick only the whitelisted fields and serialize to JSON-safe primitives.
// Never spread the raw Prisma row — that would drag in id/createdAt/updatedAt
// and make every UPDATE look like it changed `updatedAt`.
export function snapshot(
  entity: AuditEntity,
  row: Record<string, unknown> | null | undefined,
): Prisma.JsonObject | null {
  if (!row) return null;
  const out: Prisma.JsonObject = {};
  for (const key of SNAPSHOT_FIELDS[entity]) {
    const v = row[key];
    if (v instanceof Date) out[key] = v.toISOString();
    else if (v === undefined) out[key] = null;
    else out[key] = v as Prisma.JsonValue;
  }
  return out;
}

// Keys whose serialized values differ between two snapshots.
export function diffKeys(
  before: Prisma.JsonObject | null,
  after: Prisma.JsonObject | null,
): string[] {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) changed.push(k);
  }
  return changed;
}

// Resolve the actor's point-in-time identity. Call this BEFORE opening the
// transaction — the JWT only carries { id, role }, so name comes from the DB,
// and Neon interactive transactions have a tight time budget.
export async function loadActor(userId: string): Promise<AuditActor> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true },
  });
  return {
    id: userId,
    role: (user?.role ?? 'OWNER') as Role,
    name: user?.name ?? 'Unknown',
  };
}

export async function recordAudit(
  tx: Prisma.TransactionClient,
  args: {
    entity: AuditEntity;
    entityId: string;
    action: AuditAction;
    actor: AuditActor;
    ctx: AuditContext;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    reason?: string | null;
  },
): Promise<void> {
  const before = snapshot(args.entity, args.before);
  const after = snapshot(args.entity, args.after);
  const changedFields =
    args.action === 'UPDATE' ? diffKeys(before, after) : [];

  // A no-op save shouldn't pollute the trail.
  if (args.action === 'UPDATE' && changedFields.length === 0) return;

  await tx.auditLog.create({
    data: {
      entity: args.entity,
      entityId: args.entityId,
      action: args.action,
      actorId: args.actor.id,
      actorRole: args.actor.role,
      actorName: args.actor.name,
      ownerId: args.ctx.ownerId,
      subPropertyId: args.ctx.subPropertyId,
      tenancyId: args.ctx.tenancyId,
      before: before ?? Prisma.JsonNull,
      after: after ?? Prisma.JsonNull,
      changedFields,
      reason: args.reason?.trim() || null,
    },
  });
}

// ── Reads ────────────────────────────────────────────────────────────────────

export type AuditLogItem = {
  id: string;
  entity: AuditEntity;
  entityId: string;
  action: AuditAction;
  actorName: string;
  actorRole: Role;
  before: Prisma.JsonValue;
  after: Prisma.JsonValue;
  changedFields: string[];
  reason: string | null;
  createdAt: Date;
  tenancyId: string;
  subPropertyId: string;
  tenant: { name: string } | null;
  unit: { name: string; unitNumber: string } | null;
};

const AUDIT_SELECT = {
  id: true,
  entity: true,
  entityId: true,
  action: true,
  actorName: true,
  actorRole: true,
  before: true,
  after: true,
  changedFields: true,
  reason: true,
  createdAt: true,
  tenancyId: true,
  subPropertyId: true,
  tenancy: { select: { tenant: { select: { name: true } } } },
  subProperty: { select: { name: true, unitNumber: true } },
} satisfies Prisma.AuditLogSelect;

function toItem(r: Prisma.AuditLogGetPayload<{ select: typeof AUDIT_SELECT }>): AuditLogItem {
  return {
    id: r.id,
    entity: r.entity,
    entityId: r.entityId,
    action: r.action,
    actorName: r.actorName,
    actorRole: r.actorRole,
    before: r.before,
    after: r.after,
    changedFields: r.changedFields,
    reason: r.reason,
    createdAt: r.createdAt,
    tenancyId: r.tenancyId,
    subPropertyId: r.subPropertyId,
    tenant: r.tenancy?.tenant ?? null,
    unit: r.subProperty
      ? { name: r.subProperty.name, unitNumber: r.subProperty.unitNumber }
      : null,
  };
}

// History for a single entity (the per-row popover). `subPropertyIds` scopes a
// manager to their units — an out-of-scope entityId returns [], not a 403.
export async function listAuditForEntity(
  entity: AuditEntity,
  entityId: string,
  scope: { ownerId: string; subPropertyIds?: string[] },
): Promise<AuditLogItem[]> {
  const rows = await prisma.auditLog.findMany({
    where: {
      entity,
      entityId,
      ownerId: scope.ownerId,
      ...(scope.subPropertyIds
        ? { subPropertyId: { in: scope.subPropertyIds } }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: AUDIT_SELECT,
  });
  return rows.map(toItem);
}

export type AuditFilters = {
  entity?: AuditEntity;
  action?: AuditAction;
  actorId?: string;
  subPropertyId?: string;
  // Manager scope: restrict to these units.
  subPropertyIds?: string[];
  from?: Date;
  to?: Date;
  take?: number;
};

// The owner audit feed. When `subPropertyIds` is passed (manager), results are
// restricted to those units — this one filter is the entire "manager sees only
// their units" rule.
export async function listAuditForOwner(
  ownerId: string,
  filters: AuditFilters = {},
): Promise<AuditLogItem[]> {
  const take = Math.min(Math.max(filters.take ?? 200, 1), 500);
  const rows = await prisma.auditLog.findMany({
    where: {
      ownerId,
      ...(filters.entity ? { entity: filters.entity } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.subPropertyId
        ? { subPropertyId: filters.subPropertyId }
        : filters.subPropertyIds
          ? { subPropertyId: { in: filters.subPropertyIds } }
          : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take,
    select: AUDIT_SELECT,
  });
  return rows.map(toItem);
}
