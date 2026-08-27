import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const {
      agencyName,
      location,
      skills = [],
      commissionRate = '5% per deal',
      bio,
      phone,
      email,
    } = body;

    if (!location || typeof location !== 'string' || !location.trim()) {
      return NextResponse.json(
        { error: 'Primary operational location is required.' },
        { status: 400 },
      );
    }

    // Check if user already has an agent profile
    const existingAgent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (existingAgent) {
      return NextResponse.json(
        { error: 'You are already registered as an Agent.', agent: existingAgent },
        { status: 409 },
      );
    }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true, location: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Generate unique invite code e.g. AGT-JOHN4829
    const cleanName = user.name.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 5) || 'AGENT';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const inviteCode = `AGT-${cleanName}${randomSuffix}`;

    const agentCount = await prisma.agent.count();
    const displayId = `AG-${String(agentCount + 1).padStart(4, '0')}`;

    const parsedSkills = Array.isArray(skills) && skills.length > 0
      ? skills.map((s: string) => String(s).trim()).filter(Boolean)
      : ['Residential Leasing', 'Tenant Placement'];

    const newAgent = await prisma.agent.create({
      data: {
        displayId,
        userId,
        agencyName: agencyName ? String(agencyName).trim() : null,
        location: location.trim(),
        skills: parsedSkills,
        commissionRate: commissionRate ? String(commissionRate).trim() : '5% per deal',
        bio: bio ? String(bio).trim() : null,
        inviteCode,
        phone: phone ? String(phone).trim() : user.phone,
        email: email ? String(email).trim() : user.email,
        rating: 5.0,
        reviewCount: 0,
        totalDeals: 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Agent profile activated successfully!',
        agent: newAgent,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Agent register error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to register as Agent' },
      { status: 500 },
    );
  }
}
