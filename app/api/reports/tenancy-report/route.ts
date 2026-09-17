import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { renderReportPdf } from '@/lib/reports/render';
import { TenancyReportPDF, type TenancyReportData } from '@/lib/reports/tenancy-report';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: body.tenancyId },
    select: {
      id: true, displayId: true, ownerId: true, startDate: true, endDate: true,
      monthlyRent: true, securityDeposit: true, status: true, subPropertyId: true,
      tenant: {
        select: { name: true, email: true, phone: true, displayId: true, nationalId: true },
      },
      subProperty: {
        select: {
          name: true, unitNumber: true, displayId: true,
          property: { select: { name: true, address: true, displayId: true } },
        },
      },
      rentableEntity: {
        select: {
          name: true, code: true, displayId: true,
          property: { select: { name: true, address: true, displayId: true } },
        },
      },
      rentLedger: {
        orderBy: { dueDate: 'asc' },
        select: { dueDate: true, amountDue: true, amountPaid: true, status: true, paidDate: true },
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

  const data: TenancyReportData = {
    tenant: {
      name: tenancy.tenant.name,
      email: tenancy.tenant.email ?? '—',
      phone: tenancy.tenant.phone,
      displayId: tenancy.tenant.displayId,
      nationalId: tenancy.tenant.nationalId,
    },
    unit: {
      name: unit && 'name' in unit ? unit.name : '—',
      unitNumber: tenancy.subProperty?.unitNumber ?? tenancy.rentableEntity?.code ?? '—',
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
      status: tenancy.status,
      displayId: tenancy.displayId,
    },
    ledger: tenancy.rentLedger.map((l) => ({
      month: `${MONTH_LABELS[l.dueDate.getUTCMonth()]} ${l.dueDate.getUTCFullYear()}`,
      amountDue: l.amountDue,
      amountPaid: l.amountPaid,
      balance: l.amountDue - l.amountPaid,
      status: l.status,
      paidDate: l.paidDate,
    })),
    generatedAt: new Date(),
    accountId: owner?.accountId ?? '—',
  };

  try {
    const blob = await renderReportPdf(TenancyReportPDF({ data }));
    return new Response(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="tenancy-report.pdf"',
      },
    });
  } catch (err) {
    console.error('Failed to render tenancy report:', err);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}
