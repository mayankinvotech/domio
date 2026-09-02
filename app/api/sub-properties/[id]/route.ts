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
      include: {
        tenancies: { select: { id: true } },
      },
    });

    if (rentableEntity) {
      // Find all descendant IDs recursively
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

        // Delete descendants from bottom to top
        for (const entityId of allIds.reverse()) {
          await tx.rentableEntity.delete({ where: { id: entityId } });
        }
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