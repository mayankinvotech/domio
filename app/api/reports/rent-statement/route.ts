import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { renderReportPdf } from '@/lib/reports/render';
import { RentStatementPDF, type RentStatementData } from '@/lib/reports/rent-statement';

function pdfResponse(blob: Blob, filename: string) {
  return new Response(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.tenancyId !== 'string') {
    return NextResponse.json({ error: 'A tenancyId is required.' }, { status: 400 });
  }

  const periodFrom = body.periodFrom ? new Date(body.periodFrom) : new Date(0);
  const periodTo = body.periodTo ? new Date(body.periodTo) : new Date();

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: body.tenancyId },
    select: {
      id: true,
      displayId: true,
      ownerId: true,
      startDate: true,
      endDate: true,
      monthlyRent: true,
      securityDeposit: true,
      subPropertyId: true,
      tenant: {
        select: { name: true, email: true, phone: true, displayId: true },
      },
      subProperty: {
        select: {
          name: true,
          unitNumber: true,
          displayId: true,
          property: { select: { name: true, address: true, displayId: true } },
        },
      },
      rentableEntity: {
        select: {
          name: true,
          code: true,
          displayId: true,
          property: { select: { name: true, address: true, displayId: true } },
        },
      },
      ledgerEntries: {
        where: { date: { gte: periodFrom, lte: periodTo } },
        orderBy: { date: 'asc' },
        select: { date: true, rentFor: true, type: true, description: true, amount: true },
      },
    },
  });

  if (!tenancy || tenancy.ownerId !== ds.ownerId) {
    return NextResponse.json({ error: 'Tenancy not found.' }, { status: 404 });
  }
  if (ds.isManager && !ds.scope.subPropertyIds.includes(tenancy.subPropertyId ?? '')) {
    return NextResponse.json({ error: 'Tenancy not found.' }, { status: 404 });
  }

  const owner = await prisma.user.findUnique({
    where: { id: ds.ownerId },
    select: { accountId: true },
  });

  const unit = tenancy.subProperty ?? tenancy.rentableEntity;
  const property = tenancy.subProperty?.property ?? tenancy.rentableEntity?.property;

  const data: RentStatementData = {
    tenant: {
      name: tenancy.tenant.name,
      email: tenancy.tenant.email ?? '—',
      phone: tenancy.tenant.phone,
      displayId: tenancy.tenant.displayId,
    },
    unit: {
      name: unit && 'name' in unit ? unit.name : '—',
      unitNumber:
        tenancy.subProperty?.unitNumber ?? tenancy.rentableEntity?.code ?? '—',
      displayId: unit?.displayId ?? null,
    },
    property: {
      name: property?.name ?? '—',
      address: property?.address ?? '—',
      displayId: property?.displayId ?? null,
    },
    tenancy: {
      startDate: tenancy.startDate,
      endDate: tenancy.endDate,
      monthlyRent: tenancy.monthlyRent,
      securityDeposit: tenancy.securityDeposit,
      displayId: tenancy.displayId,
    },
    entries: tenancy.ledgerEntries.map((e) => ({
      date: e.date,
      rentFor: e.rentFor,
      type: e.type,
      description: e.description,
      amount: e.amount,
    })),
    generatedAt: new Date(),
    accountId: owner?.accountId ?? '—',
    periodFrom,
    periodTo,
  };

  try {
    const blob = await renderReportPdf(RentStatementPDF({ data }));
    return pdfResponse(blob, 'rent-statement.pdf');
  } catch (err) {
    console.error('Failed to render rent statement:', err);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}
