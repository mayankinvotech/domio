import type {
  PortfolioType,
  PropertyType,
  PropertyStatus,
  SubPropertyStatus,
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

  const [portfolios, docCountRows, managerRows, paymentRows, balanceRows] =
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

  const mapped = portfolios.map((p) => {
    const properties: OverviewProperty[] = p.properties.map((pr) => {
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

        // Collected this month from LedgerEntry PAYMENT entries (not RentLedger).
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

      return {
        id: pr.id,
        displayId: pr.displayId,
        name: pr.name,
        address: pr.address,
        city: pr.city,
        country: pr.country,
        status: pr.status,
        type: pr.type,
        unitCount: units.length,
        occupiedCount: units.filter((u) => u.status === 'OCCUPIED').length,
        monthlyExpected: units.reduce((s, u) => s + u.monthlyExpected, 0),
        monthlyCollected: units.reduce((s, u) => s + u.monthlyCollected, 0),
        overdueCount: units.filter((u) => u.overdueAmount > 0).length,
        expiringCount: units.filter((u) => u.expiringSoon).length,
        documentCount: docCounts.get(pr.id) ?? 0,
        managerName: managerByProperty.get(pr.id) ?? null,
        unitsExpanded: pr.unitsExpanded,
        unitsGroupBy: pr.unitsGroupBy,
        unitSections: (pr.unitSections as UnitSection[] | null) ?? null,
        units,
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
