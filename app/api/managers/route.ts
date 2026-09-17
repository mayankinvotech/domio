import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateManagerDisplayId } from '@/lib/display-ids';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Only Owners create managers for themselves — a manager cannot create
  // sub-managers, and Super Admins manage owners, not their managers.
  if (session.user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Only property owners can add managers.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, email, phone, password } = body as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
  }
  if (typeof email !== 'string' || !email.trim() || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json(
      { error: 'A password of at least 8 characters is required.' },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const accountId = await generateManagerDisplayId().catch(() => null);
    const manager = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        password: hashed,
        role: 'MANAGER',
        accountId,
        ownerId: session.user.id,
      },
      select: { id: true, name: true, email: true, phone: true, accountId: true },
    });
    return NextResponse.json({ manager }, { status: 201 });
  } catch (err) {
    console.error('Failed to create manager:', err);
    return NextResponse.json(
      { error: 'Failed to create manager. Please try again.' },
      { status: 500 },
    );
  }
}
