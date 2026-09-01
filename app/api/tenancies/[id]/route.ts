import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ds = await resolveDataScope(session.user);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

    const tenancy = await prisma.tenancy.findUnique({
      where: { id },
      include: { subProperty: true, rentableEntity: true },
    });

    if (!tenancy || (!isSuperAdmin && tenancy.ownerId !== session.user.id && tenancy.ownerId !== ds.ownerId)) {
      return NextResponse.json({ error: 'Tenancy not found or access denied.' }, { status: 404 });
    }

    const { status, monthlyRent, securityDeposit, startDate, endDate, paymentDayOfMonth } = body;

    const data: Record<string, any> = {};
    if (status) data.status = status;
    if (monthlyRent !== undefined) data.monthlyRent = Number(monthlyRent);
    if (securityDeposit !== undefined) data.securityDeposit = Number(securityDeposit);
    if (paymentDayOfMonth !== undefined) data.paymentDayOfMonth = Math.min(28, Math.max(1, Number(paymentDayOfMonth)));
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);

    const updated = await prisma.tenancy.update({
      where: { id },
      data,
    });

    // If terminated or ended, set unit back to VACANT if no other active leases
    if (status === 'TERMINATED' || status === 'ENDED') {
      if (tenancy.subPropertyId) {
        const remainingActive = await prisma.tenancy.findFirst({
          where: {
            subPropertyId: tenancy.subPropertyId,
            status: 'ACTIVE',
            id: { not: id },
          },
        });
        if (!remainingActive) {
          await prisma.subProperty.update({
            where: { id: tenancy.subPropertyId },
            data: { status: 'VACANT' },
          });
        }
      }

      if (tenancy.rentableEntityId) {
        const remainingActive = await prisma.tenancy.findFirst({
          where: {
            rentableEntityId: tenancy.rentableEntityId,
            status: 'ACTIVE',
            id: { not: id },
          },
        });
        if (!remainingActive) {
          await prisma.rentableEntity.update({
            where: { id: tenancy.rentableEntityId },
            data: { status: 'VACANT' },
          });
        }
      }
    }

    return NextResponse.json({ success: true, tenancy: updated });
  } catch (error: any) {
    console.error('[API tenancies/[id] PATCH] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update tenancy' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ds = await resolveDataScope(session.user);
    const { id } = await params;

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

    const tenancy = await prisma.tenancy.findUnique({
      where: { id },
    });

    if (!tenancy || (!isSuperAdmin && tenancy.ownerId !== session.user.id && tenancy.ownerId !== ds.ownerId)) {
      return NextResponse.json({ error: 'Tenancy not found or access denied.' }, { status: 404 });
    }

    await prisma.tenancy.delete({
      where: { id },
    });

    if (tenancy.subPropertyId) {
      const remainingActive = await prisma.tenancy.findFirst({
        where: { subPropertyId: tenancy.subPropertyId, status: 'ACTIVE' },
      });
      if (!remainingActive) {
        await prisma.subProperty.update({
          where: { id: tenancy.subPropertyId },
          data: { status: 'VACANT' },
        });
      }
    }

    if (tenancy.rentableEntityId) {
      const remainingActive = await prisma.tenancy.findFirst({
        where: { rentableEntityId: tenancy.rentableEntityId, status: 'ACTIVE' },
      });
      if (!remainingActive) {
        await prisma.rentableEntity.update({
          where: { id: tenancy.rentableEntityId },
          data: { status: 'VACANT' },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Tenancy deleted' });
  } catch (error: any) {
    console.error('[API tenancies/[id] DELETE] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete tenancy' },
      { status: 500 },
    );
  }
}
