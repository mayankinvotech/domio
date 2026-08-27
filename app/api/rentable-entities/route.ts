import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import {
  parseRentableEntityInput,
  listRentableEntitiesForProperty,
} from '@/lib/rentable-entities';
import { generateRentableEntityId, generateUnitId } from '@/lib/display-ids';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('propertyId');

  if (!propertyId) {
    return NextResponse.json(
      { error: 'propertyId query param is required' },
      { status: 400 },
    );
  }

  const ds = await resolveDataScope(session.user);
  let entities = await listRentableEntitiesForProperty(propertyId, ds.ownerId);

  // Auto-provision root PROPERTY entity if none exists so users are never blocked
  if (entities.length === 0) {
    const prop = await prisma.property.findFirst({
      where: { id: propertyId, ownerId: ds.ownerId },
    });
    if (prop) {
      const displayId = await generateRentableEntityId().catch(() => null);
      await prisma.rentableEntity.create({
        data: {
          displayId,
          type: 'PROPERTY',
          name: prop.name,
          code: prop.displayId || 'PROP',
          rentAmount: 0,
          status: 'VACANT',
          propertyId: prop.id,
          ownerId: ds.ownerId,
        },
      });
      entities = await listRentableEntitiesForProperty(propertyId, ds.ownerId);
    }
  }

  return NextResponse.json({ entities });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ds = await resolveDataScope(session.user);
  if (ds.isManager) {
    return NextResponse.json(
      { error: 'Managers cannot create rental entities.' },
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

  const parsed = parseRentableEntityInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const displayId = await generateRentableEntityId();

  try {
    const entity = await prisma.rentableEntity.create({
      data: {
        displayId,
        type: parsed.data.type,
        name: parsed.data.name,
        code: parsed.data.code,
        parentId: parsed.data.parentId,
        areaSqft: parsed.data.areaSqft,
        rentAmount: parsed.data.rentAmount,
        status: parsed.data.status,
        notes: parsed.data.notes,
        sortOrder: parsed.data.sortOrder,
        propertyId,
        ownerId: ds.ownerId,
      },
    });

    // Also sync to SubProperty table if it's a rentable unit so it appears in standard unit blocks
    if (parsed.data.type !== 'PROPERTY') {
      const unitDisplayId = await generateUnitId().catch(() => null);
      await prisma.subProperty.create({
        data: {
          displayId: unitDisplayId,
          name: parsed.data.name,
          unitNumber: parsed.data.code,
          floor: parsed.data.type === 'FLOOR' ? parsed.data.name : null,
          areaSqft: parsed.data.areaSqft,
          rentAmount: parsed.data.rentAmount,
          status: parsed.data.status,
          notes: parsed.data.notes,
          propertyId,
          ownerId: ds.ownerId,
        },
      }).catch((err) => {
        console.warn('SubProperty dual-sync note:', err);
      });
    }

    return NextResponse.json({ entity }, { status: 201 });
  } catch (err: unknown) {
    console.error('Failed to create rentable entity:', err);
    return NextResponse.json(
      { error: 'Failed to create rentable entity. Please try again.' },
      { status: 500 },
    );
  }
}
