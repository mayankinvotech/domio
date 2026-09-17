import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { renderReportPdf } from '@/lib/reports/render';
import { PortfolioSummaryPDF, type PortfolioSummaryData } from '@/lib/reports/portfolio-summary';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;

function bump(
  map: Map<string, { income: number; expenses: number }>,
  key: string,
  field: 'income' | 'expenses',
  amt: number,
) {
  const cur = map.get(key) ?? { income: 0, expenses: 0 };
  cur[field] += amt;
  map.set(key, cur);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.portfolioId !== 'string') {
    return NextResponse.json({ error: 'A portfolioId is required.' }, { status: 400 });
  }

  const portfolio = await prisma.portfolio.findUnique({
    where: { id: body.portfolioId },
    select: { id: true, name: true, displayId: true, type: true, ownerId: true },
  });
  if (!portfolio || portfolio.ownerId !== ds.ownerId) {
    return NextResponse.json({ error: 'Portfolio not found.' }, { status: 404 });
  }

  const scope = ds.isManager ? ds.scope : undefined;
  const dateFrom = body.dateFrom ? new Date(body.dateFrom) : new Date(0);
  const dateToRaw = body.dateTo ? new Date(body.dateTo) : new Date();
  const dateTo = new Date(dateToRaw.getTime() + 24 * 60 * 60 * 1000);

  const properties = await prisma.property.findMany({
    where: {
      portfolioId: portfolio.id,
      ...(scope ? { id: { in: scope.propertyIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      displayId: true,
      subProperties: { select: { id: true, status: true } },
      rentableEntities: { select: { id: true, status: true, parentId: true } },
    },
  });
  const propertyIds = properties.map((p) => p.id);

  if (propertyIds.length === 0) {
    const owner = await prisma.user.findUnique({ where: { id: ds.ownerId }, select: { accountId: true } });
    const data: PortfolioSummaryData = {
      portfolio: { name: portfolio.name, displayId: portfolio.displayId, type: portfolio.type },
      dateFrom,
      dateTo: dateToRaw,
      properties: [],
      totals: { income: 0, expenses: 0, net: 0 },
      trend: [],
      generatedAt: new Date(),
      accountId: owner?.accountId ?? '—',
    };
    const blob = await renderReportPdf(PortfolioSummaryPDF({ data }));
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="portfolio-summary.pdf"',
      },
    });
  }

  const tenancyScopeWhere = {
    ownerId: ds.ownerId,
    OR: [
      { subProperty: { propertyId: { in: propertyIds } } },
      { rentableEntity: { propertyId: { in: propertyIds } } },
    ],
  };

  const [payments, charges, propExpenses, portfolioExpenses] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { type: 'PAYMENT', date: { gte: dateFrom, lt: dateTo }, tenancy: tenancyScopeWhere },
      select: {
        amount: true,
        date: true,
        tenancy: {
          select: {
            subProperty: { select: { propertyId: true } },
            rentableEntity: { select: { propertyId: true } },
          },
        },
      },
    }),
    prisma.ledgerEntry.findMany({
      where: { type: 'RENT_CHARGE', date: { gte: dateFrom, lt: dateTo }, tenancy: tenancyScopeWhere },
      select: {
        amount: true,
        date: true,
        tenancy: {
          select: {
            subProperty: { select: { propertyId: true } },
            rentableEntity: { select: { propertyId: true } },
          },
        },
      },
    }),
    prisma.expense.findMany({
      where: { ownerId: ds.ownerId, propertyId: { in: propertyIds }, date: { gte: dateFrom, lt: dateTo } },
      select: { propertyId: true, amount: true, date: true },
    }),
    prisma.expense.findMany({
      where: {
        ownerId: ds.ownerId,
        portfolioId: portfolio.id,
        propertyId: null,
        date: { gte: dateFrom, lt: dateTo },
      },
      select: { amount: true, date: true },
    }),
  ]);

  const collectedByProp = new Map<string, number>();
  const expectedByProp = new Map<string, number>();
  const expensesByProp = new Map<string, number>();
  const trendMap = new Map<string, { income: number; expenses: number }>();

  for (const e of payments) {
    const pid = e.tenancy.subProperty?.propertyId ?? e.tenancy.rentableEntity?.propertyId;
    if (pid) collectedByProp.set(pid, (collectedByProp.get(pid) ?? 0) + e.amount);
    bump(trendMap, monthKey(e.date), 'income', e.amount);
  }
  for (const e of charges) {
    const pid = e.tenancy.subProperty?.propertyId ?? e.tenancy.rentableEntity?.propertyId;
    if (pid) expectedByProp.set(pid, (expectedByProp.get(pid) ?? 0) + Math.abs(e.amount));
  }
  for (const e of propExpenses) {
    if (e.propertyId) expensesByProp.set(e.propertyId, (expensesByProp.get(e.propertyId) ?? 0) + e.amount);
    bump(trendMap, monthKey(e.date), 'expenses', e.amount);
  }
  for (const e of portfolioExpenses) {
    bump(trendMap, monthKey(e.date), 'expenses', e.amount);
  }

  const propRows = properties.map((p) => {
    const leafReIds = new Set(
      p.rentableEntities.filter((n) => !p.rentableEntities.some((c) => c.parentId === n.id)).map((n) => n.id),
    );
    const reUnits = p.rentableEntities.filter((n) => leafReIds.has(n.id));
    const totalUnits = p.subProperties.length + reUnits.length;
    const occupiedUnits =
      p.subProperties.filter((u) => u.status === 'OCCUPIED').length +
      reUnits.filter((u) => u.status === 'OCCUPIED').length;
    const occupiedPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const collected = collectedByProp.get(p.id) ?? 0;
    const expected = expectedByProp.get(p.id) ?? 0;
    const expensesTotal = expensesByProp.get(p.id) ?? 0;
    const collectionPct = expected > 0 ? Math.round((collected / expected) * 100) : collected > 0 ? 100 : 0;
    return {
      name: p.name,
      displayId: p.displayId,
      occupiedPct,
      collectionPct,
      collected,
      expected,
      expenses: expensesTotal,
      netIncome: collected - expensesTotal,
    };
  });

  const totalIncome = propRows.reduce((s, r) => s + r.collected, 0);
  const totalExpenses =
    propRows.reduce((s, r) => s + r.expenses, 0) + portfolioExpenses.reduce((s, e) => s + e.amount, 0);

  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      return ay - by || am - bm;
    })
    .map(([key, v]) => {
      const [y, m] = key.split('-').map(Number);
      return { month: `${MONTH_LABELS[m]} ${y}`, income: v.income, expenses: v.expenses };
    });

  const owner = await prisma.user.findUnique({ where: { id: ds.ownerId }, select: { accountId: true } });

  const data: PortfolioSummaryData = {
    portfolio: { name: portfolio.name, displayId: portfolio.displayId, type: portfolio.type },
    dateFrom,
    dateTo: dateToRaw,
    properties: propRows,
    totals: { income: totalIncome, expenses: totalExpenses, net: totalIncome - totalExpenses },
    trend,
    generatedAt: new Date(),
    accountId: owner?.accountId ?? '—',
  };

  try {
    const blob = await renderReportPdf(PortfolioSummaryPDF({ data }));
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="portfolio-summary.pdf"',
      },
    });
  } catch (err) {
    console.error('Failed to render portfolio summary:', err);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}
