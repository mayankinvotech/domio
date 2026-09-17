import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { id } = await params;

  const owner = await prisma.user.findFirst({ where: { id, role: 'OWNER' } });
  if (!owner) {
    return NextResponse.json({ error: 'Owner not found.' }, { status: 404 });
  }

  try {
    // Deleting an owner cascades through everything scoped to them. Most
    // owner-scoped rows already cascade at the DB level via their relations;
    // managers (role MANAGER, ownerId = this owner) do not automatically
    // cascade, so detach/delete them explicitly first.
    await prisma.$transaction([
      prisma.propertyAccess.deleteMany({ where: { ownerId: id } }),
      prisma.user.deleteMany({ where: { ownerId: id, role: 'MANAGER' } }),
      prisma.user.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete owner:', err);
    return NextResponse.json(
      {
        error:
          'Failed to delete owner. They may still have properties or tenants — remove those first.',
      },
      { status: 500 },
    );
  }
}
