import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') ?? searchParams.get('address') ?? searchParams.get('keyword') ?? '').trim();
    const typeQuery = (searchParams.get('type') ?? '').trim();
    const locationQuery = (searchParams.get('location') ?? '').trim();

    // Fetch all active properties with their units
    const properties = await prisma.property.findMany({
      where: {
        status: { in: ['ACTIVE', 'VACANT'] },
      },
      select: {
        id: true,
        displayId: true,
        name: true,
        address: true,
        city: true,
        country: true,
        type: true,
        customType: true,
        ownerId: true,
        ownerName: true,
        ownerEmail: true,
        ownerPhone: true,
        images: true,
        listingStatus: true,
        status: true,
        notes: true,
        latitude: true,
        longitude: true,
        subProperties: {
          select: {
            id: true,
            name: true,
            unitNumber: true,
            rentAmount: true,
            areaSqft: true,
            status: true,
          },
        },
        rentableEntities: {
          select: {
            id: true,
            name: true,
            code: true,
            rentAmount: true,
            areaSqft: true,
            type: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Helper for keyword similarity / fuzzy token matching
    function matchesKeyword(text: string | null | undefined, term: string): boolean {
      if (!text || !term) return false;
      const cleanText = text.toLowerCase();
      const cleanTerm = term.toLowerCase().trim();
      if (cleanText.includes(cleanTerm)) return true;

      // Check word token overlaps
      const tokens = cleanTerm.split(/\s+/).filter(Boolean);
      return tokens.some((t) => cleanText.includes(t));
    }

    // Filter properties based on general query, type query, and location query
    const results = properties.filter((p) => {
      let matches = true;

      // 1. General search query (can match type, customType, name, location, notes)
      if (q) {
        const matchesGeneral =
          matchesKeyword(p.name, q) ||
          matchesKeyword(p.customType, q) ||
          matchesKeyword(p.type, q) ||
          matchesKeyword(p.address, q) ||
          matchesKeyword(p.city, q) ||
          matchesKeyword(p.country, q) ||
          matchesKeyword(p.notes, q) ||
          matchesKeyword(p.ownerName, q);
        if (!matchesGeneral) matches = false;
      }

      // 2. Specific type filter (e.g. "hospital", "land", "flat", "hotel")
      if (typeQuery && typeQuery !== 'ALL') {
        const matchesType =
          matchesKeyword(p.customType, typeQuery) ||
          matchesKeyword(p.type, typeQuery);
        if (!matchesType) matches = false;
      }

      // 3. Specific location filter (e.g. "New York", "London")
      if (locationQuery) {
        const matchesLocation =
          matchesKeyword(p.address, locationQuery) ||
          matchesKeyword(p.city, locationQuery) ||
          matchesKeyword(p.country, locationQuery);
        if (!matchesLocation) matches = false;
      }

      return matches;
    });

    // Format output
    const formatted = results.map((p) => {
      const allUnits = [
        ...p.subProperties.map((u) => ({
          id: u.id,
          name: u.name,
          unitNumber: u.unitNumber,
          rentAmount: u.rentAmount,
          areaSqft: u.areaSqft,
          type: 'Unit',
          status: u.status,
        })),
        ...p.rentableEntities.map((r) => ({
          id: r.id,
          name: r.name,
          unitNumber: r.code,
          rentAmount: r.rentAmount,
          areaSqft: r.areaSqft,
          type: r.type,
          status: r.status,
        })),
      ];

      const vacantUnits = allUnits.filter((u) => u.status === 'VACANT');
      const rents = (vacantUnits.length > 0 ? vacantUnits : allUnits).map(
        (u) => u.rentAmount,
      );
      const minRentAmount = rents.length > 0 ? Math.min(...rents) : 0;

      // Default curated photography if owner hasn't uploaded photos yet
      const defaultPhotos = [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1502005229762-ee1b2da97a06?auto=format&fit=crop&w=800&q=80',
      ];

      const propertyImages =
        p.images && p.images.length > 0 ? p.images : defaultPhotos;

      return {
        id: p.id,
        displayId: p.displayId,
        name: p.name,
        address: p.address,
        city: p.city,
        country: p.country,
        type: p.type,
        customType: p.customType,
        ownerId: p.ownerId,
        ownerName: p.ownerName,
        ownerEmail: p.ownerEmail,
        ownerPhone: p.ownerPhone,
        images: propertyImages,
        listingStatus: p.listingStatus || 'Available now',
        notes: p.notes,
        vacantUnitCount: vacantUnits.length,
        totalUnitCount: allUnits.length,
        minRentAmount: minRentAmount || 1200,
        vacantUnits,
      };
    });

    return NextResponse.json({
      properties: formatted,
      query: q,
      totalCount: formatted.length,
    });
  } catch (error: any) {
    console.error('Public search error:', error);
    return NextResponse.json(
      { error: error?.message || 'Search failed' },
      { status: 500 },
    );
  }
}
