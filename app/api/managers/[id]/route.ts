import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getOwnedManager } from '@/lib/managers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const manager = await getOwnedManager(id, session.user.id);
  if (!manager) {
    return NextResponse.json({ error: 'Manager not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, email, phone, aiFullPortfolioRead, active } = body as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'A valid name is required.' }, { status: 400 });
    }
    data.name = name.trim();
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }
    const lower = email.trim().toLowerCase();
    if (lower !== manager.email) {
      const existing = await prisma.user.findUnique({ where: { email: lower } });
      if (existing) {
        return NextResponse.json(
          { error: 'An account with this email already exists.' },
          { status: 409 },
        );
      }
    }
    data.email = lower;
  }
  if (phone !== undefined) {
    data.phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
  }
  if (typeof aiFullPortfolioRead === 'boolean') {
    data.aiFullPortfolioRead = aiFullPortfolioRead;
  }
  if (typeof active === 'boolean') {
    data.active = active;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        accountId: true,
        active: true,
        aiFullPortfolioRead: true,
      },
    });
    return NextResponse.json({ manager: updated });
  } catch (err) {
    console.error('Failed to update manager:', err);
    return NextResponse.json(
      { error: 'Failed to update manager. Please try again.' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const manager = await getOwnedManager(id, session.user.id);
  if (!manager) {
    return NextResponse.json({ error: 'Manager not found.' }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      prisma.propertyAccess.deleteMany({ where: { managerId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete manager:', err);
    return NextResponse.json(
      { error: 'Failed to delete manager. Please try again.' },
      { status: 500 },
    );
  }
}
