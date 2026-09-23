import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { handleMaintenanceStatusCascade } from '@/lib/rentable-entities';

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
    const rentableEntity = await prisma.rentableEntity.findFirst({
      where: { id, ownerId: ds.ownerId },
      include: {
        tenancies: { select: { id: true } },
      },
    });

    if (!rentableEntity) {
      return NextResponse.json(
        { error: 'Rental entity not found or unauthorized' },
        { status: 404 },
      );
    }

    async function collectDescendantIds(parentId: string): Promise<string[]> {
      const children = await prisma.rentableEntity.findMany({
        where: { parentId, ownerId: ds.ownerId },
        select: { id: true },
      });
      let ids: string[] = [];
      for (const child of children) {
        ids.push(child.id);
        const grandChildren = await collectDescendantIds(child.id);
        ids = ids.concat(grandChildren);
      }
      return ids;
    }

    const allIds = [id, ...(await collectDescendantIds(id))];

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

      for (const entityId of allIds.reverse()) {
        await tx.rentableEntity.delete({ where: { id: entityId } });
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting rentable entity:', err);
    return NextResponse.json(
      { error: 'Failed to delete rental entity. Please try again.' },
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
    const existing = await prisma.rentableEntity.findFirst({
      where: { id, ownerId: ds.ownerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Rental entity not found or unauthorized' },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const updates: {
      status?: 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';
      rentAmount?: number;
      name?: string;
      code?: string;
      notes?: string | null;
      areaSqft?: number | null;
      sortOrder?: number | null;
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
    }

    if (body.notes !== undefined) {
      updates.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
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

    if (body.sortOrder !== undefined) {
      if (body.sortOrder === null || body.sortOrder === '') {
        updates.sortOrder = null;
      } else {
        const order = Number(body.sortOrder);
        if (Number.isInteger(order)) {
          updates.sortOrder = order;
        }
      }
    }

    const updatedEntity = await prisma.rentableEntity.update({
      where: { id },
      data: updates,
    });

    if (updates.status) {
      await handleMaintenanceStatusCascade(id, updates.status, ds.ownerId);

      // When a unit is set to MAINTENANCE, terminate active tenancies on all
      // descendant sub-units so that internal rent/collection calculations stay
      // consistent (no active rent should accrue for units under maintenance).
      if (updates.status === 'MAINTENANCE') {
        const descendantIds = await prisma.$queryRaw<{ id: string }[]>`
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
          SELECT id FROM descendants WHERE id != ${id}
        `;
        const descIds = descendantIds.map((r) => r.id);
        if (descIds.length > 0) {
          // Terminate active tenancies on all descendant entities
          await prisma.tenancy.updateMany({
            where: {
              rentableEntityId: { in: descIds },
              status: 'ACTIVE',
            },
            data: { status: 'ENDED' },
          });
        }
      }
    }

    // Also sync updates to any dual-synced SubProperty matching this entity
    const matchingSubProp = await prisma.subProperty.findFirst({
      where: {
        propertyId: existing.propertyId,
        ownerId: ds.ownerId,
        OR: [
          { unitNumber: existing.code },
          { name: existing.name },
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
        console.warn('Matching SubProperty sync warning:', err);
      });
    }

    return NextResponse.json({ entity: updatedEntity });
  } catch (err: unknown) {
    console.error('Error updating rentable entity:', err);
    return NextResponse.json(
      { error: 'Failed to update rental entity. Please try again.' },
      { status: 500 },
    );
  }
}