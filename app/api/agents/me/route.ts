import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId: session.user.id },
      include: {
        invitedUsers: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            properties: {
              select: { id: true, name: true, customType: true },
            },
            tenancies: {
              where: { status: 'ACTIVE' },
              select: { id: true, monthlyRent: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        hiringRequests: {
          orderBy: { createdAt: 'desc' },
        },
        deals: {
          orderBy: { dealDate: 'desc' },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ isAgent: false, agent: null });
    }

    // Calculate total commission earned & deals count
    const totalCommissionEarned = agent.deals.reduce(
      (sum, d) => sum + d.commissionAmount,
      0,
    );

    // Calculate estimated pipeline from invited owners' properties
    const totalPropertiesManaged = agent.invitedUsers.reduce(
      (sum, u) => sum + u.properties.length,
      0,
    );

    return NextResponse.json({
      isAgent: true,
      agent: {
        ...agent,
        totalCommissionEarned,
        totalPropertiesManaged,
        invitedCount: agent.invitedUsers.length,
        pendingHiringCount: agent.hiringRequests.filter(
          (h) => h.status === 'PENDING',
        ).length,
      },
    });
  } catch (error: any) {
    console.error('Agent me error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 },
    );
  }
}
