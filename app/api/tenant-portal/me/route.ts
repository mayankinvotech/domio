import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyTenantJwt, TENANT_JWT_COOKIE } from '@/lib/tenant-otp';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TENANT_JWT_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyTenantJwt(token);
    if (!payload?.sub) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        email: true,
        location: true,
        tenancies: {
          orderBy: { startDate: 'desc' },
          include: {
            subProperty: {
              include: { property: true },
            },
            rentableEntity: {
              include: { property: true },
            },
            rentLedger: {
              orderBy: { dueDate: 'asc' },
            },
            ledgerEntries: {
              orderBy: { date: 'desc' },
            },
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Build rich tenancy data for every lease (active AND past)
    const tenancies = tenant.tenancies.map((t) => {
      const prop =
        t.subProperty?.property ?? t.rentableEntity?.property ?? null;

      const unitName =
        t.subProperty?.name ?? t.rentableEntity?.name ?? 'Rental Unit';

      const unitRef =
        t.subProperty?.unitNumber ?? t.rentableEntity?.code ?? '—';

      // Running balance from ledger entries
      const balance = t.ledgerEntries.reduce((acc, e) => acc + e.amount, 0);

      // Totals from rent ledger rows
      const totalDue = t.rentLedger.reduce((s, r) => s + r.amountDue, 0);
      const totalPaid = t.rentLedger.reduce((s, r) => s + r.amountPaid, 0);
      const overdueMonths = t.rentLedger.filter((r) => r.status === 'OVERDUE').length;

      return {
        id: t.id,
        status: t.status,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        monthlyRent: t.monthlyRent,
        securityDeposit: t.securityDeposit,
        paymentDayOfMonth: t.paymentDayOfMonth,
        unitName,
        unitRef,
        propertyName: prop?.name ?? 'Property',
        propertyAddress: prop ? `${prop.address}, ${prop.city}` : '—',
        propertyImages: prop?.images ?? [],
        balance,
        totalDue,
        totalPaid,
        overdueMonths,
        rentLedger: t.rentLedger.map((r) => ({
          id: r.id,
          dueDate: r.dueDate.toISOString(),
          amountDue: r.amountDue,
          amountPaid: r.amountPaid,
          paidDate: r.paidDate?.toISOString() ?? null,
          rentFor: r.rentFor?.toISOString() ?? null,
          status: r.status,
          reference: r.reference,
          paymentMethod: r.paymentMethod,
          notes: r.notes,
        })),
        ledgerEntries: t.ledgerEntries.map((l) => ({
          id: l.id,
          type: l.type,
          amount: l.amount,
          date: l.date.toISOString(),
          description: l.description,
        })),
      };
    });

    // Summary stats across all tenancies
    const activeTenancies = tenancies.filter((t) => t.status === 'ACTIVE');
    const totalOutstanding = tenancies.reduce((s, t) => s + Math.min(0, t.balance), 0);
    const totalPaidAllTime = tenancies.reduce((s, t) => s + t.totalPaid, 0);

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        username: tenant.username,
        phone: tenant.phone,
        email: tenant.email,
        location: tenant.location,
      },
      tenancies,
      summary: {
        totalProperties: tenancies.length,
        activeCount: activeTenancies.length,
        totalOutstanding: Math.abs(totalOutstanding),
        totalPaidAllTime,
        hasOverdue: tenancies.some((t) => t.overdueMonths > 0),
      },
    });
  } catch (error: any) {
    console.error('Tenant me error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 },
    );
  }
}
