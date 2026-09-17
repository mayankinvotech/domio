import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getOwnedManager } from '@/lib/managers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; accessId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: managerId, accessId } = await params;
  const manager = await getOwnedManager(managerId, session.user.id);
  if (!manager) {
    return NextResponse.json({ error: 'Manager not found.' }, { status: 404 });
  }

  const record = await prisma.propertyAccess.findFirst({
    where: { id: accessId, managerId, ownerId: session.user.id },
  });
  if (!record) {
    return NextResponse.json({ error: 'Access record not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.canEditRentLedger !== 'boolean') {
    return NextResponse.json(
      { error: 'A valid canEditRentLedger flag is required.' },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.propertyAccess.update({
      where: { id: accessId },
      data: { canEditRentLedger: body.canEditRentLedger },
    });
    return NextResponse.json({ access: updated });
  } catch (err) {
    console.error('Failed to update access record:', err);
    return NextResponse.json(
      { error: 'Failed to update access. Please try again.' },
      { status: 500 },
    );
  }
}
