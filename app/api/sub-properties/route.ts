import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { parseUnitInput } from '@/lib/sub-properties';
import { generateUnitId } from '@/lib/display-ids';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ds = await resolveDataScope(session.user);
  if (ds.isManager) {
    return NextResponse.json(
      { error: 'Managers cannot create units.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const propertyId = body.propertyId;
  if (!propertyId || typeof propertyId !== 'string') {
    return NextResponse.json(
      { error: 'propertyId is required' },
      { status: 400 },
    );
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, ownerId: ds.ownerId },
  });

  if (!property) {
    return NextResponse.json(
      { error: 'Property not found or unauthorized' },
      { status: 404 },
    );
  }

  const parsed = parseUnitInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const displayId = await generateUnitId().catch(() => null);

  try {
    const unit = await prisma.subProperty.create({
      data: {
        displayId,
        name: parsed.data.name,
        unitNumber: parsed.data.unitNumber,
        floor: parsed.data.floor,
        areaSqft: parsed.data.areaSqft,
        rentAmount: parsed.data.rentAmount,
        status: parsed.data.status,
        notes: parsed.data.notes,
        propertyId,
        ownerId: ds.ownerId,
      },
    });

    return NextResponse.json({ unit }, { status: 201 });
  } catch (err: unknown) {
    console.error('Failed to create sub-property:', err);
    return NextResponse.json(
      { error: 'Failed to create unit. Please try again.' },
      { status: 500 },
    );
  }
}
