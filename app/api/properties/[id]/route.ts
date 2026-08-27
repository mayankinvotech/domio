import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import type { PropertyType, PropertyStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ds = await resolveDataScope(session.user);

  const existing = await prisma.property.findFirst({
    where: { id, ownerId: ds.ownerId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Property not found or unauthorized' },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    name,
    address,
    city,
    country,
    type,
    customType,
    status,
    listingStatus,
    images,
    notes,
  } = body;

  try {
    const updated = await prisma.property.update({
      where: { id },
      data: {
        ...(name ? { name: String(name).trim() } : {}),
        ...(address ? { address: String(address).trim() } : {}),
        ...(city ? { city: String(city).trim() } : {}),
        ...(country ? { country: String(country).trim() } : {}),
        ...(type ? { type: type as PropertyType } : {}),
        ...(customType !== undefined ? { customType: customType ? String(customType).trim() : null } : {}),
        ...(status ? { status: status as PropertyStatus } : {}),
        ...(listingStatus ? { listingStatus: String(listingStatus) } : {}),
        ...(images !== undefined && Array.isArray(images) ? { images: images.slice(0, 5).map(String) } : {}),
        ...(notes !== undefined ? { notes: notes ? String(notes).trim() : null } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update property' },
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
  const ds = await resolveDataScope(session.user);

  const existing = await prisma.property.findFirst({
    where: { id, ownerId: ds.ownerId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Property not found or unauthorized' },
      { status: 404 },
    );
  }

  try {
    await prisma.property.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete property' },
      { status: 500 },
    );
  }
}
