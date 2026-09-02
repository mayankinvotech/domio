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