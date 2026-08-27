import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = (searchParams.get('location') ?? searchParams.get('q') ?? '').trim().toLowerCase();

    if (!location) {
      // Return top available agents and active properties/owners
      const [agents, properties] = await Promise.all([
        prisma.agent.findMany({
          take: 6,
          orderBy: { rating: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, phone: true, email: true },
            },
          },
        }),
        prisma.property.findMany({
          take: 6,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
            address: true,
            type: true,
            customType: true,
            ownerId: true,
            ownerName: true,
            owner: {
              select: { id: true, name: true, location: true },
            },
          },
        }),
      ]);

      return NextResponse.json({
        agents: agents.map((a) => ({
          id: a.id,
          userId: a.userId,
          name: a.user.name,
          agencyName: a.agencyName,
          location: a.location,
          skills: a.skills,
          commissionRate: a.commissionRate,
          rating: a.rating,
          reviewCount: a.reviewCount,
        })),
        owners: properties.map((p) => ({
          id: p.ownerId,
          userId: p.owner.id,
          name: p.ownerName || p.owner.name,
          propertyName: p.name,
          propertyId: p.id,
          location: `${p.city}, ${p.country}`,
          address: p.address,
          propertyType: p.customType || p.type,
        })),
      });
    }

    // Keyword & location filtering
    const [allAgents, allProperties] = await Promise.all([
      prisma.agent.findMany({
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.property.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
          address: true,
          type: true,
          customType: true,
          ownerId: true,
          ownerName: true,
          owner: {
            select: { id: true, name: true, location: true },
          },
        },
      }),
    ]);

    const matchedAgents = allAgents.filter((a) => {
      const matchLoc = a.location.toLowerCase().includes(location);
      const matchSkill = a.skills.some((s) => s.toLowerCase().includes(location));
      const matchName = a.user.name.toLowerCase().includes(location) || (a.agencyName && a.agencyName.toLowerCase().includes(location));
      return matchLoc || matchSkill || matchName;
    });

    const matchedProperties = allProperties.filter((p) => {
      const matchLoc =
        p.city.toLowerCase().includes(location) ||
        p.country.toLowerCase().includes(location) ||
        p.address.toLowerCase().includes(location) ||
        (p.owner.location && p.owner.location.toLowerCase().includes(location));
      const matchType = (p.customType && p.customType.toLowerCase().includes(location)) || p.type.toLowerCase().includes(location);
      const matchName = p.name.toLowerCase().includes(location) || (p.ownerName && p.ownerName.toLowerCase().includes(location));
      return matchLoc || matchType || matchName;
    });

    return NextResponse.json({
      agents: matchedAgents.map((a) => ({
        id: a.id,
        userId: a.userId,
        name: a.user.name,
        agencyName: a.agencyName,
        location: a.location,
        skills: a.skills,
        commissionRate: a.commissionRate,
        rating: a.rating,
        reviewCount: a.reviewCount,
      })),
      owners: matchedProperties.map((p) => ({
        id: p.ownerId,
        userId: p.owner.id,
        name: p.ownerName || p.owner.name,
        propertyName: p.name,
        propertyId: p.id,
        location: `${p.city}, ${p.country}`,
        address: p.address,
        propertyType: p.customType || p.type,
      })),
    });
  } catch (error: any) {
    console.error('Search owners and agents error:', error);
    return NextResponse.json({ error: error?.message || 'Search failed' }, { status: 500 });
  }
}
