import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import {
  getCollectionMatrix,
  applyCollectionFilter,
  currentFyStartYear,
  type CollectionLevel,
} from '@/lib/collection-report';
import { renderReportPdf } from '@/lib/reports/render';
import { CollectionReportPDF, type CollectionReportData } from '@/lib/reports/collection-report';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);
  const body = await request.json().catch(() => ({}));

  const fyStartYear = Number.isInteger(body?.fy) ? body.fy : currentFyStartYear();
  const by: CollectionLevel = body?.by === 'property' ? 'property' : 'unit';
  const portfolioId = typeof body?.portfolioId === 'string' && body.portfolioId ? body.portfolioId : undefined;
  const propertyId = typeof body?.propertyId === 'string' && body.propertyId ? body.propertyId : undefined;
  const unitId = typeof body?.unitId === 'string' && body.unitId ? body.unitId : undefined;

  const scope = ds.isManager ? ds.scope : undefined;
  const full = await getCollectionMatrix(ds.ownerId, fyStartYear, by, scope);
  const m = applyCollectionFilter(full, { portfolioId, propertyId, unitId });

  let scopeLabel = by === 'property' ? 'All properties' : 'All units';
  if (unitId) {
    const col = full.columns.find((c) => c.id === unitId);
    scopeLabel = col ? (col.sublabel ? `${col.sublabel} — ${col.label}` : col.label) : 'Selected unit';
  } else if (propertyId) {
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

  const rows = m.columns.map((c) => ({
    unit: c.label,
    tenant: c.sublabel ?? '—',
    opening: m.openingByColumn[c.id] ?? 0,
    byMonth: m.received[c.id] ?? {},
    received: m.totalByColumn[c.id] ?? 0,
    due: m.dueByColumn[c.id] ?? 0,
  }));

  const data: CollectionReportData = {
    fyLabel: m.fyLabel,
    scopeLabel,
    months: m.months,
    rows,
    totals: {
      opening: m.grandOpening,
      byMonth: m.totalByMonth,
      received: m.grandReceived,
      due: m.grandDue,
    },
    generatedAt: new Date(),
    accountId: owner?.accountId ?? '—',
  };

  try {
    const blob = await renderReportPdf(CollectionReportPDF({ data }));
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="collection-report.pdf"',
      },
    });
  } catch (err) {
    console.error('Failed to render collection report:', err);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}
