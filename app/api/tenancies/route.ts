import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { generateTenancyId } from '@/lib/display-ids';
import {
  checkAncestorLeaseConflict,
  checkDescendantLeaseConflict,
} from '@/lib/rentable-entities';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ds = await resolveDataScope(session.user);
    const body = await req.json().catch(() => ({}));

    const {
      tenantId,
      subPropertyId,
      rentableEntityId,
      startDate,
      endDate,
      monthlyRent,
      securityDeposit,
      paymentDayOfMonth,
    } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required.' }, { status: 400 });
    }

    if (!subPropertyId && !rentableEntityId) {
      return NextResponse.json(
        { error: 'A valid unit or rentable entity is required.' },
        { status: 400 },
      );
    }

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    if (!start || Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Valid start date is required.' }, { status: 400 });
    }
    if (!end || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Valid end date is required.' }, { status: 400 });
    }
    if (end <= start) {
      return NextResponse.json({ error: 'End date must be after start date.' }, { status: 400 });
    }

    const rent = Number(monthlyRent);
    if (!Number.isFinite(rent) || rent < 0) {
      return NextResponse.json({ error: 'Valid monthly rent is required.' }, { status: 400 });
    }

    const deposit = securityDeposit !== undefined && securityDeposit !== '' ? Number(securityDeposit) : 0;
    const day = paymentDayOfMonth ? Math.min(28, Math.max(1, Number(paymentDayOfMonth))) : 1;

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, ownerId: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 44 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

    let targetOwnerId = ds.ownerId;

    // If unit is a standard SubProperty
    if (subPropertyId) {
      const unit = await prisma.subProperty.findUnique({
        where: { id: subPropertyId },
        include: { property: true },
      });
      if (!unit) {
        return NextResponse.json({ error: 'Unit not found.' }, { status: 404 });
      }
      if (!isSuperAdmin && unit.property.ownerId !== ds.ownerId) {
        return NextResponse.json({ error: 'Access denied for this unit.' }, { status: 403 });
      }
      targetOwnerId = unit.property.ownerId;

      // Check for active lease
      const existingLease = await prisma.tenancy.findFirst({
        where: {
          subPropertyId,
          status: 'ACTIVE',
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });
      if (existingLease) {
        return NextResponse.json(
          { error: 'This unit already has an active lease for the selected period.' },
          { status: 400 },
        );
      }
    }

    // If unit is a hierarchical RentableEntity (Building/Floor/Room/Bed)
    if (rentableEntityId) {
      const entity = await prisma.rentableEntity.findUnique({
        where: { id: rentableEntityId },
      });
      if (!entity) {
        return NextResponse.json({ error: 'Rental entity not found.' }, { status: 404 });
      }
      if (!isSuperAdmin && entity.ownerId !== ds.ownerId) {
        return NextResponse.json({ error: 'Access denied for this entity.' }, { status: 403 });
      }
      targetOwnerId = entity.ownerId;

      // Enforce Ancestor Conflict: Cannot lease sub-unit if parent floor/building is leased
      const ancestorConflict = await checkAncestorLeaseConflict(rentableEntityId, start, end);
      if (ancestorConflict) {
        return NextResponse.json(
          {
            error:
              'Cannot lease this unit because its parent floor/building already has an active lease for this period.',
          },
          { status: 400 },
        );
      }

      // Enforce Descendant Conflict: Cannot lease floor/building if any child room/bed is leased
      const descendantConflict = await checkDescendantLeaseConflict(rentableEntityId, start, end);
      if (descendantConflict) {
        return NextResponse.json(
          {
            error:
              'Cannot lease this entire floor/unit because one or more of its sub-units/beds already have active leases.',
          },
          { status: 400 },
        );
      }
    }

    // Link tenant to owner if not set
    if (!tenant.ownerId) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { ownerId: targetOwnerId },
      });
    }

    const displayId = await generateTenancyId();

    const tenancy = await prisma.tenancy.create({
      data: {
        displayId,
        tenantId,
        subPropertyId: subPropertyId || null,
        rentableEntityId: rentableEntityId || null,
        startDate: start,
        endDate: end,
        monthlyRent: rent,
        securityDeposit: deposit,
        paymentDayOfMonth: day,
        status: 'ACTIVE',
        ownerId: targetOwnerId,
      },
    });

    // Mark unit/entity as occupied
    if (subPropertyId) {
      await prisma.subProperty.update({
        where: { id: subPropertyId },
        data: { status: 'OCCUPIED' },
      });
    }
    if (rentableEntityId) {
      await prisma.rentableEntity.update({
        where: { id: rentableEntityId },
        data: { status: 'OCCUPIED' },
      });
    }

    return NextResponse.json({ success: true, tenancyId: tenancy.id }, { status: 201 });
  } catch (error: any) {
    console.error('[API tenancies POST] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create tenancy' },
      { status: 500 },
    );
  }
}
