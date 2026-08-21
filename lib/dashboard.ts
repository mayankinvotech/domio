import type { ExpenseCategory, UtilityType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { markOverdueBills } from '@/lib/utilities';
import { getPortfolioOverview } from '@/lib/portfolio-overview';
import { getEntityTypeLabel } from '@/lib/document-types';

const DAY_MS = 1000 * 60 * 60 * 24;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Shapes (all serializable) ────────────────────────────────────────────────

export type TenantCollection = {
  tenantName: string;
  unitName: string;
  monthlyRent: number;
  collectedThisMonth: number;
  percentage: number;
};

export type RecentActivityItem = {
  id: string;
  kind: 'payment' | 'expense';
  description: string;
  sub: string;
  amount: number;
  date: string; // ISO
  when: string; // relative
  monthTag: string; // e.g. "Jul"
  initials: string;
};

export type UnitStatus = {
  unitId: string;
  unitName: string;
  tenantName: string | null;
  currentBalance: number;
  monthlyRent: number;
  status: 'vacant' | 'paid' | 'amber' | 'overdue';
  href: string;
};

export type OverdueAlert = {
  entryId: string | null;
  tenantName: string;
  unitLabel: string;
  amount: number;
  daysOverdue: number;
  href: string;
};
export type ExpiringAlert = {
  tenancyId: string;
  tenantName: string;
  unitLabel: string;
  daysRemaining: number;
  href: string;
};
export type VacantAlert = {
  unitId: string;
  unitLabel: string;
  propertyName: string;
  rent: number;
  href: string;
};
export type UtilityAlert = {
  billId: string;
  type: UtilityType;
  propertyName: string;
  amount: number;
};
export type DocumentAlert = {
  id: string;
  name: string;
  entityLabel: string;
  daysRemaining: number;
};

export type ChartPoint = { month: string; expected: number; collected: number };

export type DashboardData = {
  month: number;
  year: number;
  isCurrentMonth: boolean;
  monthLabel: string; // "July 2026"
  monthShort: string; // "Jul"
  fyLabel: string; // "FY 2026-27"
  fyRangeLabel: string; // "Apr – Jul 2026"
  propertyName: string; // for "Unit Status · X"
  monthlyExpected: number;
  monthlyCollected: number;
  collectionRate: number;
  totalOverdue: number;
  annualExpected: number;
  collectedFY: number;
  expensesFY: number;
  tenantCollections: TenantCollection[];
  recentActivity: RecentActivityItem[];
  unitStatuses: UnitStatus[];
  alerts: {
    overdue: OverdueAlert[];
    expiring: ExpiringAlert[];
    vacant: VacantAlert[];
    utility: UtilityAlert[];
    document: DocumentAlert[];
    total: number;
  };
  chart: ChartPoint[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '–';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeTime(date: Date, now: Date): string {
  const diff = now.getTime() - date.getTime();
  if (diff < 0) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function categoryLabel(c: ExpenseCategory): string {
  return c.charAt(0) + c.slice(1).toLowerCase();
}

// ── Main load ────────────────────────────────────────────────────────────────

export async function getDashboardData(
  ownerId: string,
  month: number, // 0-11
  year: number,
  // Manager scope: restrict every figure to accessible properties/units.
  scope?: { propertyIds: string[]; subPropertyIds: string[] },
): Promise<DashboardData> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));
  // Indian financial year (Apr → Mar), anchored to *today* (not the viewed month).
  const cy = now.getUTCFullYear();
  const cm = now.getUTCMonth();
  const fyStartYear = cm >= 3 ? cy : cy - 1;
  const fyStart = new Date(Date.UTC(fyStartYear, 3, 1));
  const fyEnd = new Date(Date.UTC(fyStartYear + 1, 3, 1));

  // Scope fragments — empty (no-op) for owners.
  const ledgerEntryWhere = scope
    ? { tenancy: { ownerId, subPropertyId: { in: scope.subPropertyIds } } }
    : { tenancy: { ownerId } };
  const tenancyScope = scope
    ? { subPropertyId: { in: scope.subPropertyIds } }
    : {};
  const propUnitScope = scope
    ? {
        OR: [
          { propertyId: { in: scope.propertyIds } },
          { subPropertyId: { in: scope.subPropertyIds } },
        ],
      }
    : {};
  const utilScope = scope
    ? {
        utilityAccount: {
          OR: [
            { propertyId: { in: scope.propertyIds } },
            { subPropertyId: { in: scope.subPropertyIds } },
          ],
        },
      }
    : {};
  const docScope = scope
    ? {
        OR: [
          { entityType: 'PROPERTY' as const, entityId: { in: scope.propertyIds } },
          {
            entityType: 'SUB_PROPERTY' as const,
            entityId: { in: scope.subPropertyIds },
          },
        ],
      }
    : {};

  await markOverdueBills(ownerId);

  const [
    overview,
    activeTenancies,
    monthPayments,
    fyPaymentsAgg,
    fyExpensesAgg,
    recentPayments,
    recentExpenses,
    utilityBills,
    expiringDocuments,
    fyEntries,
  ] = await Promise.all([
    getPortfolioOverview(ownerId, scope),
    // Active tenancies → monthly expected + per-tenant collection rows.
    prisma.tenancy.findMany({
      where: { ownerId, status: 'ACTIVE', ...tenancyScope },
      select: {
        id: true,
        monthlyRent: true,
        tenant: { select: { name: true } },
        subProperty: { select: { name: true, unitNumber: true } },
        rentableEntity: { select: { name: true, code: true } },
      },
    }),
    // Payments in the selected month.
    prisma.ledgerEntry.findMany({
      where: { ...ledgerEntryWhere, type: 'PAYMENT', date: { gte: monthStart, lt: monthEnd } },
      select: { tenancyId: true, amount: true },
    }),
    // FY collected (all PAYMENT entries Apr → Mar).
    prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { ...ledgerEntryWhere, type: 'PAYMENT', date: { gte: fyStart, lt: fyEnd } },
    }),
    // FY expenses.
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { ownerId, date: { gte: fyStart, lt: fyEnd }, ...propUnitScope },
    }),
    // Recent payments (for the activity feed).
    prisma.ledgerEntry.findMany({
      where: { ...ledgerEntryWhere, type: 'PAYMENT' },
      orderBy: { date: 'desc' },
      take: 8,
      select: {
        id: true,
        amount: true,
        date: true,
        description: true,
        tenancy: {
          select: {
            tenant: { select: { name: true } },
            subProperty: { select: { name: true } },
            rentableEntity: { select: { name: true } },
          },
        },
      },
    }),
    // Recent expenses (for the activity feed).
    prisma.expense.findMany({
      where: { ownerId, ...propUnitScope },
      orderBy: { date: 'desc' },
      take: 8,
      select: {
        id: true,
        date: true,
        amount: true,
        description: true,
        category: true,
        property: { select: { name: true } },
        subProperty: { select: { unitNumber: true } },
      },
    }),
    // Overdue utility bills (alerts).
    prisma.utilityBill.findMany({
      where: { ownerId, status: 'OVERDUE', ...utilScope },
      orderBy: { dueDate: 'asc' },
      take: 20,
      select: {
        id: true,
        amount: true,
        amountPaid: true,
        utilityAccount: {
          select: {
            type: true,
            portfolio: { select: { name: true } },
            property: { select: { name: true } },
            subProperty: { select: { property: { select: { name: true } } } },
          },
        },
      },
    }),
    // Documents expiring within 30 days (alerts).
    prisma.document.findMany({
      where: {
        ownerId,
        expiryDate: { gte: now, lte: new Date(now.getTime() + 30 * DAY_MS) },
        ...docScope,
      },
      orderBy: { expiryDate: 'asc' },
      select: { id: true, name: true, entityType: true, expiryDate: true },
    }),
    // FY ledger entries (rent chart).
    prisma.ledgerEntry.findMany({
      where: { ...ledgerEntryWhere, date: { gte: fyStart, lt: fyEnd } },
      select: { date: true, type: true, amount: true },
    }),
  ]);

  // ── Month + FY stat cards ──────────────────────────────────────────────────
  const monthlyExpected = activeTenancies.reduce((s, t) => s + t.monthlyRent, 0);
  const collectedByTenancy = new Map<string, number>();
  for (const p of monthPayments) {
    collectedByTenancy.set(p.tenancyId, (collectedByTenancy.get(p.tenancyId) ?? 0) + p.amount);
  }
  const monthlyCollected = monthPayments.reduce((s, p) => s + p.amount, 0);
  const collectionRate =
    monthlyExpected > 0 ? Math.round((monthlyCollected / monthlyExpected) * 100) : 0;
  const annualExpected = monthlyExpected * 12;
  const collectedFY = fyPaymentsAgg._sum.amount ?? 0;
  const expensesFY = fyExpensesAgg._sum.amount ?? 0;

  // Per-tenant collection rows (least paid first).
  const tenantCollections: TenantCollection[] = activeTenancies
    .map((t) => {
      const collected = collectedByTenancy.get(t.id) ?? 0;
      const percentage =
        t.monthlyRent > 0 ? Math.round((collected / t.monthlyRent) * 100) : 0;
      return {
        tenantName: t.tenant.name,
        unitName: t.subProperty?.name ?? t.rentableEntity?.name ?? 'Unit',
        monthlyRent: t.monthlyRent,
        collectedThisMonth: collected,
        percentage,
      };
    })
    .sort((a, b) => a.percentage - b.percentage);

  // ── Unit grid + all-time overdue (from the portfolio overview) ──────────────
  const allUnits = overview.flatMap((p) =>
    p.properties.flatMap((pr) =>
      pr.units.map((u) => ({ portfolio: p, property: pr, unit: u })),
    ),
  );
  const totalOverdue = allUnits.reduce(
    (s, x) => (x.unit.currentBalance < 0 ? s - x.unit.currentBalance : s),
    0,
  );
  const unitStatuses: UnitStatus[] = allUnits.map((x) => {
    const u = x.unit;
    const rent = u.monthlyExpected || u.rentAmount;
    let status: UnitStatus['status'];
    if (!u.tenancyId) status = 'vacant';
    else if (u.currentBalance >= 0) status = 'paid';
    else {
      const months = rent > 0 ? Math.ceil(Math.abs(u.currentBalance) / rent) : 99;
      status = months >= 2 ? 'overdue' : 'amber';
    }
    return {
      unitId: u.id,
      unitName: u.name,
      tenantName: u.tenantName,
      currentBalance: u.currentBalance,
      monthlyRent: rent,
      status,
      href: `/dashboard/portfolios/${x.portfolio.id}/properties/${x.property.id}/units/${u.id}`,
    };
  });
  const properties = overview.flatMap((p) => p.properties);
  const propertyName =
    properties.length === 1
      ? properties[0].name
      : properties.length === 0
        ? '—'
        : `${properties.length} Properties`;

  // ── Recent activity (payments + expenses, newest first) ─────────────────────
  type Act = { d: Date; item: RecentActivityItem };
  const acts: Act[] = [
    ...recentPayments.map((p) => ({
      d: p.date,
      item: {
        id: `pay-${p.id}`,
        kind: 'payment' as const,
        description: `${p.tenancy.tenant.name} paid`,
        sub: p.tenancy.subProperty?.name ?? p.tenancy.rentableEntity?.name ?? 'Unit',
        amount: p.amount,
        date: p.date.toISOString(),
        when: relativeTime(p.date, now),
        monthTag: MONTHS[p.date.getUTCMonth()],
        initials: initialsFrom(p.tenancy.tenant.name),
      },
    })),
    ...recentExpenses.map((e) => {
      const label = categoryLabel(e.category);
      return {
        d: e.date,
        item: {
          id: `exp-${e.id}`,
          kind: 'expense' as const,
          description: `${label} expense`,
          sub:
            e.property?.name ??
            (e.subProperty ? `Unit ${e.subProperty.unitNumber}` : 'General'),
          amount: e.amount,
          date: e.date.toISOString(),
          when: relativeTime(e.date, now),
          monthTag: MONTHS[e.date.getUTCMonth()],
          initials: label.slice(0, 2).toUpperCase(),
        },
      };
    }),
  ]
    .sort((a, b) => b.d.getTime() - a.d.getTime())
    .slice(0, 8);
  const recentActivity = acts.map((a) => a.item);

  // ── Alerts (Needs Attention) ────────────────────────────────────────────────
  const overdue: OverdueAlert[] = allUnits
    .filter((x) => x.unit.overdueAmount > 0)
    .sort((a, b) => (b.unit.daysOverdue ?? 0) - (a.unit.daysOverdue ?? 0))
    .map((x) => ({
      entryId: x.unit.overdueEntryId,
      tenantName: x.unit.tenantName ?? 'Tenant',
      unitLabel: `Unit ${x.unit.unitNumber}`,
      amount: x.unit.overdueAmount,
      daysOverdue: x.unit.daysOverdue ?? 0,
      href: `/dashboard/portfolios/${x.portfolio.id}/properties/${x.property.id}/units/${x.unit.id}`,
    }));

  const expiring: ExpiringAlert[] = allUnits
    .filter((x) => x.unit.expiringSoon && x.unit.tenancyId)
    .sort((a, b) => (a.unit.daysRemaining ?? 0) - (b.unit.daysRemaining ?? 0))
    .map((x) => ({
      tenancyId: x.unit.tenancyId as string,
      tenantName: x.unit.tenantName ?? 'Tenant',
      unitLabel: `Unit ${x.unit.unitNumber}`,
      daysRemaining: x.unit.daysRemaining ?? 0,
      href: `/dashboard/portfolios/${x.portfolio.id}/properties/${x.property.id}/units/${x.unit.id}`,
    }));

  const vacant: VacantAlert[] = allUnits
    .filter((x) => x.unit.status === 'VACANT')
    .map((x) => ({
      unitId: x.unit.id,
      unitLabel: `Unit ${x.unit.unitNumber}`,
      propertyName: x.property.name,
      rent: x.unit.rentAmount,
      href: `/dashboard/portfolios/${x.portfolio.id}/properties/${x.property.id}/units/${x.unit.id}`,
    }));

  const utility: UtilityAlert[] = utilityBills.map((b) => ({
    billId: b.id,
    type: b.utilityAccount.type,
    propertyName:
      b.utilityAccount.property?.name ??
      b.utilityAccount.subProperty?.property.name ??
      b.utilityAccount.portfolio?.name ??
      'Portfolio-level',
    amount: b.amount - b.amountPaid,
  }));

  const document: DocumentAlert[] = expiringDocuments.map((d) => ({
    id: d.id,
    name: d.name,
    entityLabel: getEntityTypeLabel(d.entityType),
    daysRemaining: Math.max(
      0,
      Math.ceil(((d.expiryDate as Date).getTime() - now.getTime()) / DAY_MS),
    ),
  }));

  const total =
    overdue.length + expiring.length + vacant.length + utility.length + document.length;

  // ── Chart: Indian FY (Apr → Mar) ────────────────────────────────────────────
  const buckets: ChartPoint[] = [];
  const bucketIndex = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const mm = (3 + i) % 12;
    const yy = fyStartYear + (3 + i >= 12 ? 1 : 0);
    bucketIndex.set(`${yy}-${mm}`, buckets.length);
    buckets.push({ month: MONTHS[mm], expected: 0, collected: 0 });
  }
  for (const e of fyEntries) {
    const idx = bucketIndex.get(`${e.date.getUTCFullYear()}-${e.date.getUTCMonth()}`);
    if (idx === undefined) continue;
    if (e.type === 'PAYMENT') buckets[idx].collected += e.amount;
    else if (e.type === 'RENT_CHARGE') buckets[idx].expected += Math.abs(e.amount);
  }

  return {
    month,
    year,
    isCurrentMonth: month === cm && year === cy,
    monthLabel: `${MONTHS_FULL[month]} ${year}`,
    monthShort: MONTHS[month],
    fyLabel: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`,
    fyRangeLabel: `Apr – ${MONTHS[cm]} ${fyStartYear}`,
    propertyName,
    monthlyExpected,
    monthlyCollected,
    collectionRate,
    totalOverdue,
    annualExpected,
    collectedFY,
    expensesFY,
    tenantCollections,
    recentActivity,
    unitStatuses,
    alerts: { overdue, expiring, vacant, utility, document, total },
    chart: buckets,
  };
}
