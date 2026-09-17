import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { isExpenseCategory } from '@/lib/expense-types';
import { renderReportPdf } from '@/lib/reports/render';
import { ExpenseReportPDF, type ExpenseReportData } from '@/lib/reports/expense-report';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);
  const body = await request.json().catch(() => ({}));

  const dateFrom = body?.dateFrom ? new Date(body.dateFrom) : new Date(0);
  const dateToRaw = body?.dateTo ? new Date(body.dateTo) : new Date();
  const dateToExclusive = new Date(dateToRaw.getTime() + 24 * 60 * 60 * 1000);
  const category = isExpenseCategory(body?.category) ? body.category : undefined;
  const portfolioId = typeof body?.portfolioId === 'string' && body.portfolioId ? body.portfolioId : undefined;
  const propertyId = typeof body?.propertyId === 'string' && body.propertyId ? body.propertyId : undefined;

  const scope = ds.isManager ? ds.scope : undefined;

  const rows = await prisma.expense.findMany({
    where: {
      ownerId: ds.ownerId,
      date: { gte: dateFrom, lt: dateToExclusive },
      ...(category ? { category } : {}),
      ...(propertyId ? { propertyId } : portfolioId ? { portfolioId } : {}),
      ...(scope
        ? {
            OR: [
              { propertyId: { in: scope.propertyIds } },
              { subPropertyId: { in: scope.subPropertyIds } },
            ],
          }
        : {}),
    },
    orderBy: { date: 'desc' },
    select: {
      date: true,
      category: true,
      description: true,
      amount: true,
      portfolio: { select: { name: true } },
      property: { select: { name: true } },
      subProperty: { select: { unitNumber: true, property: { select: { name: true } } } },
    },
  });

  const dataRows = rows.map((r) => ({
    date: r.date,
    category: r.category as string,
    description: r.description,
    context: r.subProperty
      ? `${r.subProperty.property.name} · Unit ${r.subProperty.unitNumber}`
      : r.property
        ? r.property.name
        : (r.portfolio?.name ?? '—'),
    amount: r.amount,
  }));

  const byCategoryMap = new Map<string, number>();
  let total = 0;
  for (const r of dataRows) {
    byCategoryMap.set(r.category, (byCategoryMap.get(r.category) ?? 0) + r.amount);
    total += r.amount;
  }
  const byCategory = Array.from(byCategoryMap.entries()).map(([cat, catTotal]) => ({
    category: cat,
    total: catTotal,
  }));

  let scopeLabel = 'All properties';
  if (propertyId) {
    const p = await prisma.property.findUnique({ where: { id: propertyId }, select: { name: true } });
    scopeLabel = p ? `Property: ${p.name}` : 'Selected property';
  } else if (portfolioId) {
    const p = await prisma.portfolio.findUnique({ where: { id: portfolioId }, select: { name: true } });
    scopeLabel = p ? `Portfolio: ${p.name}` : 'Selected portfolio';
  }

  const owner = await prisma.user.findUnique({
    where: { id: ds.ownerId },
    select: { accountId: true },
  });

  const data: ExpenseReportData = {
    scopeLabel,
    dateFrom,
    dateTo: dateToRaw,
    category: category ?? null,
    rows: dataRows,
    byCategory,
    total,
    generatedAt: new Date(),
    accountId: owner?.accountId ?? '—',
  };

  try {
    const blob = await renderReportPdf(ExpenseReportPDF({ data }));
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="expense-report.pdf"',
      },
    });
  } catch (err) {
    console.error('Failed to render expense report:', err);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}
