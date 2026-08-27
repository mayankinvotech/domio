import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { parseTenantInput } from '@/lib/tenants';
import { generateTenantId } from '@/lib/display-ids';

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
