import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ds = await resolveDataScope(session.user);

  try {
    // 1. Check if it is a SubProperty
    const subProperty = await prisma.subProperty.findFirst({
      where: { id, ownerId: ds.ownerId },
      include: {
        tenancies: { select: { id: true } },
      },
    });

    if (subProperty) {
      const tenancyIds = subProperty.tenancies.map((t) => t.id);

      await prisma.$transaction(async (tx) => {
        if (tenancyIds.length > 0) {
          // Delete ledger entries and rent ledger for all tenancies of this unit
          await tx.ledgerEntry.deleteMany({
            where: { tenancyId: { in: tenancyIds } },
          });
          await tx.rentLedger.deleteMany({
            where: { tenancyId: { in: tenancyIds } },
          });
          await tx.auditLog.deleteMany({
            where: { tenancyId: { in: tenancyIds } },
          });
          await tx.tenancy.deleteMany({
            where: { id: { in: tenancyIds } },
          });
        }

        // Clean up any direct unit associations
        await tx.propertyAccess.deleteMany({ where: { subPropertyId: id } });
        await tx.utilityAccount.deleteMany({ where: { subPropertyId: id } });
        await tx.expense.deleteMany({ where: { subPropertyId: id } });
        await tx.auditLog.deleteMany({ where: { subPropertyId: id } });

        // Delete the SubProperty
        await tx.subProperty.delete({ where: { id } });
      });

      return NextResponse.json({ success: true });
    }

    // 2. Check if it is a RentableEntity
    const rentableEntity = await prisma.rentableEntity.findFirst({
      where: { id, ownerId: ds.ownerId },
      select: { id: true },
    });

    if (rentableEntity) {
      // Single recursive query for the whole subtree instead of one
      // round-trip per tree level (matches the pattern already used by
      // cascadeVacantToDescendants in lib/rentable-entities.ts).
      const descendants = await prisma.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE descendants AS (
          SELECT id
          FROM "RentableEntity"
          WHERE id = ${id} AND "ownerId" = ${ds.ownerId}
          UNION ALL
          SELECT re.id
          FROM "RentableEntity" re
          INNER JOIN descendants d ON re."parentId" = d.id
          WHERE re."ownerId" = ${ds.ownerId}
        )
        SELECT id FROM descendants
      `;
      const allIds = descendants.map((d) => d.id);

      await prisma.$transaction(async (tx) => {
        const allTenancies = await tx.tenancy.findMany({
          where: { rentableEntityId: { in: allIds } },
          select: { id: true },
        });
        const tenancyIds = allTenancies.map((t) => t.id);

        if (tenancyIds.length > 0) {
          await tx.ledgerEntry.deleteMany({
            where: { tenancyId: { in: tenancyIds } },
          });
          await tx.rentLedger.deleteMany({
            where: { tenancyId: { in: tenancyIds } },
          });
          await tx.auditLog.deleteMany({
            where: { tenancyId: { in: tenancyIds } },
          });
          await tx.tenancy.deleteMany({
            where: { id: { in: tenancyIds } },
          });
        }

        // Single statement for the whole subtree. Postgres checks
        // (non-deferred) foreign-key constraints at end-of-statement, so
        // deleting a self-referencing parent/children set together in one
        // DELETE is safe -- no dangling reference exists once it commits.
        await tx.rentableEntity.deleteMany({ where: { id: { in: allIds } } });
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Unit not found or unauthorized' },
      { status: 404 },
    );
  } catch (err: unknown) {
    console.error('Error deleting sub-property/entity:', err);
    return NextResponse.json(
      { error: 'Failed to delete unit. Please try again.' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ds = await resolveDataScope(session.user);

  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // 1. Check if it's a SubProperty
    const subProperty = await prisma.subProperty.findFirst({
      where: { id, ownerId: ds.ownerId },
    });

    if (subProperty) {
      const updates: {
        name?: string;
        unitNumber?: string;
        floor?: string | null;
        areaSqft?: number | null;
        rentAmount?: number;
        status?: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';
        notes?: string | null;
      } = {};

      if (body.status !== undefined) {
        if (['OCCUPIED', 'VACANT', 'MAINTENANCE'].includes(body.status)) {
          updates.status = body.status;
        } else {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
      }

      if (body.rentAmount !== undefined) {
        const rent = Number(body.rentAmount);
        if (!Number.isFinite(rent) || rent < 0) {
          return NextResponse.json({ error: 'Rent amount must be a non-negative number' }, { status: 400 });
        }
        updates.rentAmount = rent;
      }

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
          return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
        }
        updates.name = body.name.trim();
      }

      if (body.unitNumber !== undefined) {
        if (typeof body.unitNumber !== 'string' || !body.unitNumber.trim()) {
          return NextResponse.json({ error: 'Unit number cannot be empty' }, { status: 400 });
        }
        updates.unitNumber = body.unitNumber.trim();
      } else if (body.code !== undefined) {
        if (typeof body.code === 'string' && body.code.trim()) {
          updates.unitNumber = body.code.trim();
        }
      }

      if (body.floor !== undefined) {
        updates.floor = typeof body.floor === 'string' && body.floor.trim() ? body.floor.trim() : null;
      }

      if (body.areaSqft !== undefined) {
        if (body.areaSqft === null || body.areaSqft === '') {
          updates.areaSqft = null;
        } else {
          const area = Number(body.areaSqft);
          if (!Number.isFinite(area) || area < 0) {
            return NextResponse.json({ error: 'Area must be a non-negative number' }, { status: 400 });
          }
          updates.areaSqft = area;
        }
      }

      if (body.notes !== undefined) {
        updates.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
      }

      const updated = await prisma.subProperty.update({
        where: { id },
        data: updates,
      });

      // Also sync to matching RentableEntity if exists
      const matchingEntity = await prisma.rentableEntity.findFirst({
        where: {
          propertyId: subProperty.propertyId,
          ownerId: ds.ownerId,
          OR: [
            { code: subProperty.unitNumber },
            { name: subProperty.name },
          ],
        },
      });

      if (matchingEntity) {
        await prisma.rentableEntity.update({
          where: { id: matchingEntity.id },
          data: {
            ...(updates.name ? { name: updates.name } : {}),
            ...(updates.unitNumber ? { code: updates.unitNumber } : {}),
            ...(updates.rentAmount !== undefined ? { rentAmount: updates.rentAmount } : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
            ...(updates.areaSqft !== undefined ? { areaSqft: updates.areaSqft } : {}),
          },
        }).catch((err) => {
          console.warn('RentableEntity dual-sync note:', err);
        });
      }

      return NextResponse.json({ unit: updated });
    }

    // 2. Check if it's a RentableEntity
    const rentableEntity = await prisma.rentableEntity.findFirst({
      where: { id, ownerId: ds.ownerId },
    });

    if (rentableEntity) {
      const updates: {
        name?: string;
        code?: string;
        areaSqft?: number | null;
        rentAmount?: number;
        status?: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';
        notes?: string | null;
      } = {};

      if (body.status !== undefined) {
        if (['OCCUPIED', 'VACANT', 'MAINTENANCE'].includes(body.status)) {
          updates.status = body.status;
        } else {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }
      }

      if (body.rentAmount !== undefined) {
        const rent = Number(body.rentAmount);
        if (!Number.isFinite(rent) || rent < 0) {
          return NextResponse.json({ error: 'Rent amount must be a non-negative number' }, { status: 400 });
        }
        updates.rentAmount = rent;
      }

      if (body.name !== undefined) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
          return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
        }
        updates.name = body.name.trim();
      }

      if (body.code !== undefined) {
        if (typeof body.code !== 'string' || !body.code.trim()) {
          return NextResponse.json({ error: 'Code cannot be empty' }, { status: 400 });
        }
        updates.code = body.code.trim();
      } else if (body.unitNumber !== undefined) {
        if (typeof body.unitNumber === 'string' && body.unitNumber.trim()) {
          updates.code = body.unitNumber.trim();
        }
      }

      if (body.areaSqft !== undefined) {
        if (body.areaSqft === null || body.areaSqft === '') {
          updates.areaSqft = null;
        } else {
          const area = Number(body.areaSqft);
          if (!Number.isFinite(area) || area < 0) {
            return NextResponse.json({ error: 'Area must be a non-negative number' }, { status: 400 });
          }
          updates.areaSqft = area;
        }
      }

      if (body.notes !== undefined) {
        updates.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
      }

      const updated = await prisma.rentableEntity.update({
        where: { id },
        data: updates,
      });

      // Sync to matching SubProperty if exists
      const matchingSubProp = await prisma.subProperty.findFirst({
        where: {
          propertyId: rentableEntity.propertyId,
          ownerId: ds.ownerId,
          OR: [
            { unitNumber: rentableEntity.code },
            { name: rentableEntity.name },
          ],
        },
      });

      if (matchingSubProp) {
        await prisma.subProperty.update({
          where: { id: matchingSubProp.id },
          data: {
            ...(updates.name ? { name: updates.name } : {}),
            ...(updates.code ? { unitNumber: updates.code } : {}),
            ...(updates.rentAmount !== undefined ? { rentAmount: updates.rentAmount } : {}),
            ...(updates.status ? { status: updates.status } : {}),
            ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
            ...(updates.areaSqft !== undefined ? { areaSqft: updates.areaSqft } : {}),
          },
        }).catch((err) => {
          console.warn('SubProperty sync note:', err);
        });
      }

      return NextResponse.json({ unit: updated });
    }

    return NextResponse.json(
      { error: 'Unit not found or unauthorized' },
      { status: 404 },
    );
  } catch (err: unknown) {
    console.error('Error updating sub-property/entity:', err);
    return NextResponse.json(
      { error: 'Failed to update unit. Please try again.' },
      { status: 500 },
    );
  }
}