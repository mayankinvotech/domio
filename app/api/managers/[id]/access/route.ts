import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getOwnedManager } from '@/lib/managers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id: managerId } = await params;
  const manager = await getOwnedManager(managerId, session.user.id);
  if (!manager) {
    return NextResponse.json({ error: 'Manager not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { propertyId, subPropertyId, accessLevel, canEditRentLedger } = body as Record<
    string,
    unknown
  >;

  if (
    (typeof propertyId !== 'string' || !propertyId) &&
    (typeof subPropertyId !== 'string' || !subPropertyId)
  ) {
    return NextResponse.json(
      { error: 'A property or unit is required.' },
      { status: 400 },
    );
  }
  if (accessLevel !== 'VIEW' && accessLevel !== 'EDIT') {
    return NextResponse.json({ error: 'A valid access level is required.' }, { status: 400 });
  }

  const ownerId = session.user.id;
  if (typeof propertyId === 'string' && propertyId) {
    const property = await prisma.property.findFirst({ where: { id: propertyId, ownerId } });
    if (!property) {
      return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
    }
  } else if (typeof subPropertyId === 'string' && subPropertyId) {
    const unit = await prisma.subProperty.findFirst({ where: { id: subPropertyId, ownerId } });
    if (!unit) {
      return NextResponse.json({ error: 'Unit not found.' }, { status: 404 });
    }
  }

  try {
    const data = {
      managerId,
      ownerId,
      propertyId: typeof propertyId === 'string' && propertyId ? propertyId : null,
      subPropertyId: typeof subPropertyId === 'string' && subPropertyId ? subPropertyId : null,
      accessLevel,
      canEditRentLedger: Boolean(canEditRentLedger),
    };
    // Upsert on whichever unique constraint applies (managerId+propertyId or
    // managerId+subPropertyId) so granting access twice just updates the grant.
    const access = data.subPropertyId
      ? await prisma.propertyAccess.upsert({
          where: {
            managerId_subPropertyId: { managerId, subPropertyId: data.subPropertyId },
          },
          create: data,
          update: { accessLevel: data.accessLevel, canEditRentLedger: data.canEditRentLedger },
        })
      : await prisma.propertyAccess.upsert({
          where: {
            managerId_propertyId: { managerId, propertyId: data.propertyId! },
          },
          create: data,
          update: { accessLevel: data.accessLevel, canEditRentLedger: data.canEditRentLedger },
        });
    return NextResponse.json({ access }, { status: 201 });
  } catch (err) {
    console.error('Failed to grant access:', err);
    return NextResponse.json(
      { error: 'Failed to grant access. Please try again.' },
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
  const { id: managerId } = await params;
  const manager = await getOwnedManager(managerId, session.user.id);
  if (!manager) {
    return NextResponse.json({ error: 'Manager not found.' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('propertyId');
  const subPropertyId = searchParams.get('subPropertyId');
  if (!propertyId && !subPropertyId) {
    return NextResponse.json(
      { error: 'A property or unit is required.' },
      { status: 400 },
    );
  }

  try {
    await prisma.propertyAccess.deleteMany({
      where: {
        managerId,
        ...(propertyId ? { propertyId } : {}),
        ...(subPropertyId ? { subPropertyId } : {}),
      },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to revoke access:', err);
    return NextResponse.json(
      { error: 'Failed to revoke access. Please try again.' },
      { status: 500 },
    );
  }
}
