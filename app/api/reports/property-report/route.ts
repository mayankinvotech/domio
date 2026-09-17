import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { getPortfolioOverview, type OverviewEntityNode } from '@/lib/portfolio-overview';
import { renderReportPdf } from '@/lib/reports/render';
import { PropertyReportPDF, type PropertyReportData } from '@/lib/reports/property-report';

function flattenEntityUnits(nodes: OverviewEntityNode[], out: PropertyReportData['units']) {
  for (const n of nodes) {
    if (n.isLeaf) {
      out.push({
        unitNumber: n.code,
        name: n.name,
        displayId: n.displayId,
        status: n.status,
        tenantName: n.activeLease?.tenantName ?? null,
        monthlyRent: n.activeLease?.monthlyRent ?? n.listedRent,
        leaseEnd: n.activeLease?.endDate ?? null,
      });
    }
    if (n.children.length) flattenEntityUnits(n.children, out);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.propertyId !== 'string') {
    return NextResponse.json({ error: 'A propertyId is required.' }, { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { id: body.propertyId },
    select: {
      id: true, name: true, address: true, city: true, country: true,
      displayId: true, type: true, status: true, ownerId: true, portfolioId: true,
    },
  });
  if (!property || property.ownerId !== ds.ownerId) {
    return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
  }
  if (ds.isManager && !ds.scope.propertyIds.includes(property.id)) {
    return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
  }

  const scope = ds.isManager ? ds.scope : undefined;
  const portfolios = await getPortfolioOverview(ds.ownerId, scope);
  let overviewProperty = null;
  for (const p of portfolios) {
    const found = p.properties.find((pr) => pr.id === property.id);
    if (found) {
      overviewProperty = found;
      break;
    }
  }

  const units: PropertyReportData['units'] = [];
  if (overviewProperty) {
    for (const u of overviewProperty.units) {
      units.push({
        unitNumber: u.unitNumber,
        name: u.name,
        displayId: u.displayId,
        status: u.status,
        tenantName: u.tenantName,
        monthlyRent: u.rentAmount,
        leaseEnd: u.leaseEndDate ? new Date(u.leaseEndDate) : null,
      });
    }
    flattenEntityUnits(overviewProperty.rentableEntities, units);
  }

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const expenseAgg = await prisma.expense.aggregate({
    where: { ownerId: ds.ownerId, propertyId: property.id, date: { gte: monthStart, lt: monthEnd } },
    _sum: { amount: true },
  });
  const expenses = expenseAgg._sum.amount ?? 0;
  const rentExpected = overviewProperty?.monthlyExpected ?? 0;
  const rentCollected = overviewProperty?.monthlyCollected ?? 0;

  const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
  const total = units.length;

  const owner = await prisma.user.findUnique({
    where: { id: ds.ownerId },
    select: { accountId: true },
  });

  const data: PropertyReportData = {
    property: {
      name: property.name,
      address: property.address,
      city: property.city,
      country: property.country,
      displayId: property.displayId,
      type: property.type,
      status: property.status,
    },
    units,
    finance: {
      rentExpected,
      rentCollected,
      expenses,
      netIncome: rentCollected - expenses,
    },
    occupancy: { occupied, total },
    generatedAt: new Date(),
    accountId: owner?.accountId ?? '—',
  };

  try {
    const blob = await renderReportPdf(PropertyReportPDF({ data }));
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="property-report.pdf"',
      },
    });
  } catch (err) {
    console.error('Failed to render property report:', err);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}
