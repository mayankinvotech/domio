import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { getPortfolioOverview, type OverviewEntityNode } from '@/lib/portfolio-overview';
import { renderReportPdf } from '@/lib/reports/render';
import { OccupancyReportPDF, type OccupancyReportData } from '@/lib/reports/occupancy-report';

const DAY_MS = 1000 * 60 * 60 * 24;

function flattenEntities(
  nodes: OverviewEntityNode[],
  propertyName: string,
  out: OccupancyReportData['units'],
) {
  for (const n of nodes) {
    if (n.isLeaf) {
      const endDate = n.activeLease?.endDate ?? null;
      out.push({
        unitNumber: n.code,
        property: propertyName,
        displayId: n.displayId,
        status: n.status,
        tenantName: n.activeLease?.tenantName ?? null,
        leaseStart: null,
        leaseEnd: endDate,
        daysRemaining: endDate ? Math.ceil((endDate.getTime() - Date.now()) / DAY_MS) : null,
        monthlyRent: n.activeLease?.monthlyRent ?? n.listedRent,
      });
    }
    if (n.children.length) flattenEntities(n.children, propertyName, out);
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);
  const body = await request.json().catch(() => ({}));
  const portfolioId = typeof body?.portfolioId === 'string' && body.portfolioId ? body.portfolioId : undefined;

  const scope = ds.isManager ? ds.scope : undefined;
  const portfolios = await getPortfolioOverview(ds.ownerId, scope);
  const filtered = portfolioId ? portfolios.filter((p) => p.id === portfolioId) : portfolios;

  const units: OccupancyReportData['units'] = [];
  for (const p of filtered) {
    for (const prop of p.properties) {
      for (const u of prop.units) {
        units.push({
          unitNumber: u.unitNumber,
          property: prop.name,
          displayId: u.displayId,
          status: u.status,
          tenantName: u.tenantName,
          leaseStart: null,
          leaseEnd: u.leaseEndDate ? new Date(u.leaseEndDate) : null,
          daysRemaining: u.daysRemaining,
          monthlyRent: u.rentAmount,
        });
      }
      flattenEntities(prop.rentableEntities, prop.name, units);
    }
  }

  const occupied = units.filter((u) => u.status === 'OCCUPIED').length;
  const total = units.length;

  let scopeLabel = 'All portfolios';
  if (portfolioId) {
    scopeLabel = filtered[0] ? `Portfolio: ${filtered[0].name}` : 'Selected portfolio';
  }

  const owner = await prisma.user.findUnique({
    where: { id: ds.ownerId },
    select: { accountId: true },
  });

  const data: OccupancyReportData = {
    scopeLabel,
    units,
    summary: { total, occupied, vacant: total - occupied },
    generatedAt: new Date(),
    accountId: owner?.accountId ?? '—',
  };

  try {
    const blob = await renderReportPdf(OccupancyReportPDF({ data }));
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="occupancy-report.pdf"',
      },
    });
  } catch (err) {
    console.error('Failed to render occupancy report:', err);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}
