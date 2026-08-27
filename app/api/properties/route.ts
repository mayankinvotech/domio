import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { generatePropertyId } from '@/lib/display-ids';
import type { PropertyType, PropertyStatus } from '@prisma/client';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ds = await resolveDataScope(session.user);
  if (ds.isManager) {
    return NextResponse.json(
      { error: 'Managers cannot create properties.' },
      { status: 403 },
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
    type = 'RESIDENTIAL',
    customType,
    status = 'ACTIVE',
    listingStatus = 'Available now',
    images = [],
    notes,
    portfolioId,
  } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Property name is required (at least 2 characters).' },
      { status: 400 },
    );
  }

  if (!address || typeof address !== 'string') {
    return NextResponse.json(
      { error: 'Property address is required.' },
      { status: 400 },
    );
  }

  if (!city || typeof city !== 'string') {
    return NextResponse.json(
      { error: 'City is required.' },
      { status: 400 },
    );
  }

  if (!country || typeof country !== 'string') {
    return NextResponse.json(
      { error: 'Country is required.' },
      { status: 400 },
    );
  }

  if (!portfolioId || typeof portfolioId !== 'string') {
    return NextResponse.json(
      { error: 'portfolioId is required.' },
      { status: 400 },
    );
  }

  // Ensure portfolio exists and belongs to the owner
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, ownerId: ds.ownerId },
  });

  if (!portfolio) {
    return NextResponse.json(
      { error: 'Portfolio not found or unauthorized.' },
      { status: 404 },
    );
  }

  // Fetch owner details to store snapshots with the property
  const ownerUser = await prisma.user.findUnique({
    where: { id: ds.ownerId },
    select: { name: true, email: true, phone: true },
  });

  const displayId = await generatePropertyId().catch(() => null);

  const validTypes: PropertyType[] = [
    'RESIDENTIAL',
    'COMMERCIAL',
    'MIXED',
    'INDUSTRIAL',
  ];
  const chosenType: PropertyType = validTypes.includes(type as PropertyType)
    ? (type as PropertyType)
    : 'RESIDENTIAL';

  const validStatuses: PropertyStatus[] = ['ACTIVE', 'VACANT', 'MAINTENANCE'];
  const chosenStatus: PropertyStatus = validStatuses.includes(
    status as PropertyStatus,
  )
    ? (status as PropertyStatus)
    : 'ACTIVE';

  try {
    const property = await prisma.property.create({
      data: {
        displayId,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
        type: chosenType,
        customType: customType ? String(customType).trim() : null,
        ownerName: ownerUser?.name || null,
        ownerEmail: ownerUser?.email || null,
        ownerPhone: ownerUser?.phone || null,
        status: chosenStatus,
        listingStatus: String(listingStatus || 'Available now'),
        images: Array.isArray(images) ? images.slice(0, 5).map(String) : [],
        notes: notes ? String(notes).trim() : null,
        portfolioId,
        ownerId: ds.ownerId,
      },
    });

    return NextResponse.json(property, { status: 201 });
  } catch (error: any) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create property.' },
      { status: 500 },
    );
  }
}
