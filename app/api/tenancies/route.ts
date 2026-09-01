import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { generateTenancyId } from '@/lib/display-ids';
import {
  checkAncestorLeaseConflict,
  checkDescendantLeaseConflict,
} from '@/lib/rentable-entities';
import { buildLedgerSchedule, computeRentStatus } from '@/lib/rent-ledger';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
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

    // ── Basic validation ───────────────────────────────────────────────────
    if (!tenantId || typeof tenantId !== 'string') {
      return NextResponse.json({ error: 'Tenant ID is required.' }, { status: 400 });
    }

    if (!subPropertyId && !rentableEntityId) {
      return NextResponse.json(
        { error: 'Please select a unit or property to assign.' },
        { status: 400 },
      );
    }

    const start = startDate ? new Date(startDate as string) : null;
    const end = endDate ? new Date(endDate as string) : null;
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

    // ── Verify tenant exists ───────────────────────────────────────────────
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, ownerId: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    // targetOwnerId = the unit's actual owner (who we will link the tenancy to)
    let targetOwnerId: string = ds.ownerId;

    // ── Standard SubProperty unit ──────────────────────────────────────────
    if (subPropertyId) {
      const unit = await prisma.subProperty.findUnique({
        where: { id: subPropertyId },
        include: { property: { select: { ownerId: true } } },
      });

      if (!unit) {
        return NextResponse.json({ error: 'Unit not found.' }, { status: 404 });
      }

      // Access check: SUPER_ADMIN can assign any unit; OWNER must own it
      if (!isSuperAdmin && unit.property.ownerId !== ds.ownerId && unit.property.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: `Access denied: this unit belongs to a different owner (unit owner: ${unit.property.ownerId}, you: ${ds.ownerId}).` },
          { status: 403 },
        );
      }

      targetOwnerId = unit.property.ownerId;

      // Check for overlapping active lease
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

    // ── Hierarchical RentableEntity (Building/Floor/Room/Bed) ────────────
    if (rentableEntityId) {
      const entity = await prisma.rentableEntity.findUnique({
        where: { id: rentableEntityId },
        select: { id: true, ownerId: true, status: true },
      });

      if (!entity) {
        return NextResponse.json({ error: 'Rental entity not found.' }, { status: 404 });
      }

      if (!isSuperAdmin && entity.ownerId !== ds.ownerId && entity.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: `Access denied: this entity belongs to a different owner (entity owner: ${entity.ownerId}, you: ${ds.ownerId}).` },
          { status: 403 },
        );
      }

      targetOwnerId = entity.ownerId;

      // Enforce Ancestor Conflict: Cannot lease sub-unit if parent floor/building is leased
      try {
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
      } catch (e) {
        console.warn('[POST /api/tenancies] Ancestor conflict check skipped:', e);
      }

      // Enforce Descendant Conflict: Cannot lease floor/building if any child room/bed is leased
      try {
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
      } catch (e) {
        console.warn('[POST /api/tenancies] Descendant conflict check skipped:', e);
      }
    }

    // ── Create tenancy + update statuses atomically ────────────────────────
    const displayId = await generateTenancyId().catch(() => null);

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

    // Pre-generate monthly rent schedules for the full lease duration
    try {
      const schedule = buildLedgerSchedule(start, end, day, rent);
      if (schedule.length > 0) {
        await prisma.rentLedger.createMany({
          data: schedule.map((item) => ({
            tenancyId: tenancy.id,
            ownerId: targetOwnerId,
            dueDate: item.dueDate,
            amountDue: item.amountDue,
            amountPaid: 0,
            status: computeRentStatus({
              amountDue: item.amountDue,
              amountPaid: 0,
              dueDate: item.dueDate,
            }),
          })),
        });
      }
    } catch (schedErr) {
      console.warn('[POST /api/tenancies] Rent schedule pre-generation note:', schedErr);
    }

    // Mark unit/entity as OCCUPIED
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

    // Always link tenant to the unit's owner
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { ownerId: targetOwnerId },
    });

    return NextResponse.json({ success: true, tenancyId: tenancy.id }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/tenancies] Unhandled error:', error?.message ?? error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create tenancy' },
      { status: 500 },
    );
  }
}
