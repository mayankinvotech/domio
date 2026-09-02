import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { generatePortfolioId } from '@/lib/display-ids';
import type { PortfolioType } from '@prisma/client';

const VALID_PORTFOLIO_TYPES: PortfolioType[] = [
  'RESIDENTIAL',
  'COMMERCIAL',
  'MIXED',
  'INDUSTRIAL',
];

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ds = await resolveDataScope(session.user);
  const portfolios = await prisma.portfolio.findMany({
    where: { ownerId: ds.ownerId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      displayId: true,
      name: true,
      type: true,
      description: true,
      createdAt: true,
      _count: { select: { properties: true } },
    },
  });

  return NextResponse.json({ portfolios });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ds = await resolveDataScope(session.user);
  if (ds.isManager) {
    return NextResponse.json(
      { error: 'Managers cannot create portfolios.' },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, type = 'RESIDENTIAL', description } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json(
      { error: 'Portfolio name is required (at least 2 characters).' },
      { status: 400 },
    );
  }

  const chosenType: PortfolioType = VALID_PORTFOLIO_TYPES.includes(
    type as PortfolioType,
  )
    ? (type as PortfolioType)
    : 'RESIDENTIAL';

  const displayId = await generatePortfolioId().catch(() => null);

  try {
    const portfolio = await prisma.portfolio.create({
      data: {
        displayId,
        name: name.trim(),
        type: chosenType,
        description: description ? String(description).trim() : null,
        ownerId: ds.ownerId,
      },
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error: any) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create portfolio.' },
      { status: 500 },
    );
  }
}
