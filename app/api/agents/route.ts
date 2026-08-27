import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = (searchParams.get('location') ?? '').trim().toLowerCase();
    const skill = (searchParams.get('skill') ?? '').trim().toLowerCase();
    const query = (searchParams.get('q') ?? '').trim().toLowerCase();

    const agents = await prisma.agent.findMany({
      where: {
        verified: true,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { rating: 'desc' },
    });

    const filtered = agents.filter((a) => {
      let matches = true;

      if (location) {
        if (!a.location.toLowerCase().includes(location)) {
          matches = false;
        }
      }

      if (skill && skill !== 'all') {
        const hasSkill = a.skills.some((s) =>
          s.toLowerCase().includes(skill),
        );
        if (!hasSkill) {
          matches = false;
        }
      }

      if (query) {
        const matchesQuery =
          a.user.name.toLowerCase().includes(query) ||
          (a.agencyName && a.agencyName.toLowerCase().includes(query)) ||
          a.location.toLowerCase().includes(query) ||
          (a.bio && a.bio.toLowerCase().includes(query)) ||
          a.skills.some((s) => s.toLowerCase().includes(query));
        if (!matchesQuery) matches = false;
      }

      return matches;
    });

    const formatted = filtered.map((a) => ({
      id: a.id,
      displayId: a.displayId,
      name: a.user.name,
      agencyName: a.agencyName,
      location: a.location,
      skills: a.skills,
      commissionRate: a.commissionRate,
      bio: a.bio,
      inviteCode: a.inviteCode,
      rating: a.rating,
      reviewCount: a.reviewCount,
      totalDeals: a.totalDeals,
      phone: a.phone || a.user.phone,
      email: a.email || a.user.email,
    }));

    return NextResponse.json({ agents: formatted, totalCount: formatted.length });
  } catch (error: any) {
    console.error('Agents search error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch agents' },
      { status: 500 },
    );
  }
}
