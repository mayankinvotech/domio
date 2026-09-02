import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { parseTenantInput } from '@/lib/tenants';
import { generateTenantId } from '@/lib/display-ids';

// GET /api/tenants?q=<search> — list owner's tenants for modal selection
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  const tenants = await prisma.tenant.findMany({
    where: {
      ownerId: ds.ownerId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    take: 50,
    select: {
      id: true,
      displayId: true,
      name: true,
      phone: true,
      email: true,
      // Include current tenancy to show "already assigned" tenants in the UI
      tenancies: {
        where: { status: 'ACTIVE' },
        take: 1,
        select: {
          id: true,
          subProperty: { select: { name: true } },
          rentableEntity: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({ tenants });
}



export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ds = await resolveDataScope(session.user);
  if (ds.isManager) {
    return NextResponse.json(
      { error: 'Managers cannot create tenants.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Check if adding an existing self-registered tenant by username handle
  if (body.username && typeof body.username === 'string') {
    const clean = body.username.trim().toLowerCase().replace(/^@/, '');
    const existing = await prisma.tenant.findUnique({
      where: { username: clean },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `No tenant found with handle @${clean}` },
        { status: 404 },
      );
    }

    const updated = await prisma.tenant.update({
      where: { id: existing.id },
      data: { ownerId: ds.ownerId },
    });

    return NextResponse.json(updated, { status: 200 });
  }

  const parsed = parseTenantInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // If owner sets a portal password, validate and hash it
  let passwordHash: string | undefined;
  const rawPassword = typeof body.password === 'string' ? body.password.trim() : null;
  if (rawPassword) {
    if (rawPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 },
      );
    }
    passwordHash = await bcrypt.hash(rawPassword, 10);
  }

  const displayId = await generateTenantId().catch(() => null);

  try {
    const tenant = await prisma.tenant.create({
      data: {
        displayId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        location: parsed.data.location,
        nationalId: parsed.data.nationalId,
        emergencyContactName: parsed.data.emergencyContactName,
        emergencyContactPhone: parsed.data.emergencyContactPhone,
        bankAccountNumber: parsed.data.bankAccountNumber,
        bankName: parsed.data.bankName,
        ownerId: ds.ownerId,
        portalEnabled: true,
        ...(passwordHash ? { password: passwordHash } : {}),
      },
    });

    return NextResponse.json(tenant, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create tenant.' },
      { status: 500 },
    );
  }
}
