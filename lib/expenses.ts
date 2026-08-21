import type { ExpenseCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  isExpenseCategory,
  type ExpenseLevel,
} from '@/lib/expense-types';

// ── Date helpers ────────────────────────────────────────────────────────────

function monthBounds(d = new Date()) {
  return {
    start: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
    end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)),
  };
}
function yearBounds(d = new Date()) {
  return {
    start: new Date(Date.UTC(d.getUTCFullYear(), 0, 1)),
    end: new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1)),
  };
}

export type ExpenseFilters = {
  category?: string;
  propertyId?: string;
  range?: string; // thisMonth | lastMonth | thisYear
  from?: string; // YYYY-MM-DD (custom)
  to?: string; // YYYY-MM-DD (custom)
  // Manager scope: restrict to expenses on these properties/units only.
  scope?: { propertyIds: string[]; subPropertyIds: string[] };
};

function resolveDateRange(
  f: ExpenseFilters,
): { gte: Date; lt: Date } | null {
  if (f.range === 'thisMonth') {
    const { start, end } = monthBounds();
    return { gte: start, lt: end };
  }
  if (f.range === 'lastMonth') {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { gte: start, lt: end };
  }
  if (f.range === 'thisYear') {
    const { start, end } = yearBounds();
    return { gte: start, lt: end };
  }
  if (f.from && f.to) {
    const gte = new Date(f.from);
    const toDate = new Date(f.to);
    if (Number.isNaN(gte.getTime()) || Number.isNaN(toDate.getTime())) return null;
    // make `to` inclusive by advancing one day
    const lt = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);
    return { gte, lt };
  }
  return null;
}

// ── Listing ─────────────────────────────────────────────────────────────────

export type ExpenseListItem = {
  id: string;
  date: Date;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  level: ExpenseLevel;
  contextName: string;
  propertyName: string | null;
};

export async function listExpensesForOwner(
  ownerId: string,
  filters: ExpenseFilters = {},
): Promise<ExpenseListItem[]> {
  const range = resolveDateRange(filters);
  const rows = await prisma.expense.findMany({
    where: {
      ownerId,
      ...(isExpenseCategory(filters.category)
        ? { category: filters.category }
        : {}),
      ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
      ...(range ? { date: { gte: range.gte, lt: range.lt } } : {}),
      ...(filters.scope
        ? {
            OR: [
              { propertyId: { in: filters.scope.propertyIds } },
              { subPropertyId: { in: filters.scope.subPropertyIds } },
            ],
          }
        : {}),
    },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      category: true,
      amount: true,
      description: true,
      portfolioId: true,
      propertyId: true,
      subPropertyId: true,
      portfolio: { select: { name: true } },
      property: { select: { name: true } },
      subProperty: {
        select: { unitNumber: true, property: { select: { name: true } } },
      },
    },
  });

  return rows.map((r) => {
    let level: ExpenseLevel;
    let contextName: string;
    let propertyName: string | null;
    if (r.subPropertyId && r.subProperty) {
      level = 'UNIT';
      propertyName = r.subProperty.property.name;
      contextName = `${r.subProperty.property.name} · Unit ${r.subProperty.unitNumber}`;
    } else if (r.propertyId && r.property) {
      level = 'PROPERTY';
      propertyName = r.property.name;
      contextName = r.property.name;
    } else {
      level = 'PORTFOLIO';
      propertyName = null;
      contextName = r.portfolio?.name ?? '—';
    }
    return {
      id: r.id,
      date: r.date,
      category: r.category,
      amount: r.amount,
      description: r.description,
      level,
      contextName,
      propertyName,
    };
  });
}

export async function getOwnedExpense(id: string, ownerId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      portfolioId: true,
      propertyId: true,
      subPropertyId: true,
      category: true,
      amount: true,
      date: true,
      description: true,
    },
  });
  if (!expense || expense.ownerId !== ownerId) return null;
  return expense;
}

// ── Input parsing + target resolution ───────────────────────────────────────

export type ParsedExpenseFields = {
  category: ExpenseCategory;
  amount: number;
  date: Date;
  description: string | null;
};

export function parseExpenseFields(
  body: unknown,
): { data: ParsedExpenseFields } | { error: string } {
  const { category, amount, date, description } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (!isExpenseCategory(category)) {
    return { error: 'A valid category is required.' };
  }
  const amt = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { error: 'A valid amount is required.' };
  }
  if (typeof date !== 'string' || !date.trim()) {
    return { error: 'A date is required.' };
  }
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return { error: 'A valid date is required.' };
  }
  return {
    data: {
      category,
      amount: amt,
      date: parsedDate,
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : null,
    },
  };
}

export type ResolvedTarget = {
  portfolioId: string | null;
  propertyId: string | null;
  subPropertyId: string | null;
};

// Resolve a level + leaf id into the (backfilled) portfolio/property/unit ids,
// verifying the target belongs to the owner.
export async function resolveExpenseTarget(
  ownerId: string,
  level: ExpenseLevel,
  targetId: string,
): Promise<{ data: ResolvedTarget } | { error: string }> {
  if (level === 'PORTFOLIO') {
    const p = await prisma.portfolio.findUnique({
      where: { id: targetId },
      select: { ownerId: true },
    });
    if (!p || p.ownerId !== ownerId) return { error: 'Portfolio not found.' };
    return { data: { portfolioId: targetId, propertyId: null, subPropertyId: null } };
  }
  if (level === 'PROPERTY') {
    const p = await prisma.property.findUnique({
      where: { id: targetId },
      select: { ownerId: true, portfolioId: true },
    });
    if (!p || p.ownerId !== ownerId) return { error: 'Property not found.' };
    return {
      data: { portfolioId: p.portfolioId, propertyId: targetId, subPropertyId: null },
    };
  }
  // UNIT
  const u = await prisma.subProperty.findUnique({
    where: { id: targetId },
    select: {
      ownerId: true,
      propertyId: true,
      property: { select: { portfolioId: true } },
    },
  });
  if (!u || u.ownerId !== ownerId) return { error: 'Unit not found.' };
  return {
    data: {
      portfolioId: u.property.portfolioId,
      propertyId: u.propertyId,
      subPropertyId: targetId,
    },
  };
}

// ── Cascading-form structure ────────────────────────────────────────────────

export type OwnerStructure = {
  id: string;
  name: string;
  properties: {
    id: string;
    name: string;
    units: { id: string; name: string; unitNumber: string }[];
  }[];
}[];

export async function getOwnerStructure(ownerId: string): Promise<OwnerStructure> {
  const portfolios = await prisma.portfolio.findMany({
    where: { ownerId },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      properties: {
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          subProperties: {
            orderBy: { unitNumber: 'asc' },
            select: { id: true, name: true, unitNumber: true },
          },
        },
      },
    },
  });
  return portfolios.map((p) => ({
    id: p.id,
    name: p.name,
    properties: p.properties.map((pr) => ({
      id: pr.id,
      name: pr.name,
      units: pr.subProperties,
    })),
  }));
}

// ── Portfolio "this month" totals (for portfolio cards) ──────────────────────

export async function getMonthlyExpenseByPortfolio(
  ownerId: string,
): Promise<Map<string, number>> {
  const { start, end } = monthBounds();
  const rows = await prisma.expense.groupBy({
    by: ['portfolioId'],
    where: {
      ownerId,
      portfolioId: { not: null },
      date: { gte: start, lt: end },
    },
    _sum: { amount: true },
  });
  return new Map(
    rows
      .filter((r) => r.portfolioId)
      .map((r) => [r.portfolioId as string, r._sum.amount ?? 0]),
  );
}

// ── Page summary bar ─────────────────────────────────────────────────────────

export type ExpensePageSummary = {
  thisMonth: number;
  thisYear: number;
  topCategories: { category: ExpenseCategory; total: number }[];
};

export async function getExpensePageSummary(
  ownerId: string,
  scope?: { propertyIds: string[]; subPropertyIds: string[] },
): Promise<ExpensePageSummary> {
  const month = monthBounds();
  const year = yearBounds();
  const s = scope
    ? {
        OR: [
          { propertyId: { in: scope.propertyIds } },
          { subPropertyId: { in: scope.subPropertyIds } },
        ],
      }
    : {};
  const [monthAgg, yearAgg, byCat] = await Promise.all([
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { ownerId, date: { gte: month.start, lt: month.end }, ...s },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { ownerId, date: { gte: year.start, lt: year.end }, ...s },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { ownerId, date: { gte: year.start, lt: year.end }, ...s },
      _sum: { amount: true },
    }),
  ]);

  const topCategories = byCat
    .map((c) => ({ category: c.category, total: c._sum.amount ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return {
    thisMonth: monthAgg._sum.amount ?? 0,
    thisYear: yearAgg._sum.amount ?? 0,
    topCategories,
  };
}

// ── Rollup (summary API, for dashboards) ─────────────────────────────────────

export type ExpenseRollup = {
  grandTotal: number;
  byCategory: { category: ExpenseCategory; total: number }[];
  byMonth: { month: string; total: number }[];
  byPortfolio: { portfolioId: string; name: string; total: number }[];
  byProperty: { propertyId: string; name: string; total: number }[];
};

export async function getExpenseRollup(ownerId: string): Promise<ExpenseRollup> {
  const now = new Date();
  const sixMonthsAgo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
  );

  const [grand, byCatRows, recent, byPortfolioRows, byPropertyRows] =
    await Promise.all([
      prisma.expense.aggregate({ _sum: { amount: true }, where: { ownerId } }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { ownerId },
        _sum: { amount: true },
      }),
      prisma.expense.findMany({
        where: { ownerId, date: { gte: sixMonthsAgo } },
        select: { date: true, amount: true },
      }),
      prisma.expense.groupBy({
        by: ['portfolioId'],
        where: { ownerId, portfolioId: { not: null } },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ['propertyId'],
        where: { ownerId, propertyId: { not: null } },
        _sum: { amount: true },
      }),
    ]);

  // Bucket recent expenses into the last 6 calendar months.
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthKeys.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }
  const monthMap = new Map(monthKeys.map((k) => [k, 0]));
  for (const e of recent) {
    const key = `${e.date.getUTCFullYear()}-${String(e.date.getUTCMonth() + 1).padStart(2, '0')}`;
    if (monthMap.has(key)) monthMap.set(key, (monthMap.get(key) ?? 0) + e.amount);
  }

  // Resolve names for portfolio/property rollups.
  const [portfolios, properties] = await Promise.all([
    prisma.portfolio.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    }),
    prisma.property.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    }),
  ]);
  const portfolioNames = new Map(portfolios.map((p) => [p.id, p.name]));
  const propertyNames = new Map(properties.map((p) => [p.id, p.name]));

  return {
    grandTotal: grand._sum.amount ?? 0,
    byCategory: byCatRows
      .map((c) => ({ category: c.category, total: c._sum.amount ?? 0 }))
      .sort((a, b) => b.total - a.total),
    byMonth: monthKeys.map((month) => ({ month, total: monthMap.get(month) ?? 0 })),
    byPortfolio: byPortfolioRows
      .filter((r) => r.portfolioId)
      .map((r) => ({
        portfolioId: r.portfolioId as string,
        name: portfolioNames.get(r.portfolioId as string) ?? '—',
        total: r._sum.amount ?? 0,
      })),
    byProperty: byPropertyRows
      .filter((r) => r.propertyId)
      .map((r) => ({
        propertyId: r.propertyId as string,
        name: propertyNames.get(r.propertyId as string) ?? '—',
        total: r._sum.amount ?? 0,
      })),
  };
}
