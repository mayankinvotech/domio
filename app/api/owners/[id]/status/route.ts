import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
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
    const updated = await prisma.user.update({
      where: { id },
      data: { active: !owner.active },
      select: { id: true, active: true },
    });
    return NextResponse.json({ owner: updated });
  } catch (err) {
    console.error('Failed to toggle owner status:', err);
    return NextResponse.json(
      { error: 'Failed to update owner status. Please try again.' },
      { status: 500 },
    );
  }
}
