import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import type { PortfolioType } from '@prisma/client';

const VALID_PORTFOLIO_TYPES: PortfolioType[] = [
  'RESIDENTIAL',
  'COMMERCIAL',
  'MIXED',
  'INDUSTRIAL',
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ds = await resolveDataScope(session.user);

  const portfolio = await prisma.portfolio.findFirst({
    where: { id, ownerId: ds.ownerId },
    select: {
      id: true,
      displayId: true,
      name: true,
      type: true,
      description: true,
      createdAt: true,
      properties: {
        select: { id: true, name: true, displayId: true },
      },
    },
  });

  if (!portfolio) {
    return NextResponse.json(
      { error: 'Portfolio not found or unauthorized' },
      { status: 404 },
    );
  }

  return NextResponse.json({ portfolio });
}

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

  if (ds.isManager) {
    return NextResponse.json(
      { error: 'Managers cannot edit portfolios.' },
      { status: 403 },
    );
  }

  const existing = await prisma.portfolio.findFirst({
    where: { id, ownerId: ds.ownerId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Portfolio not found or unauthorized' },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, type, description } = body;

  const updateData: {
    name?: string;
    type?: PortfolioType;
    description?: string | null;
  } = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Portfolio name must be at least 2 characters.' },
        { status: 400 },
      );
    }
    updateData.name = name.trim();
  }

  if (type !== undefined) {
    if (VALID_PORTFOLIO_TYPES.includes(type as PortfolioType)) {
      updateData.type = type as PortfolioType;
    }
  }

  if (description !== undefined) {
    updateData.description = description ? String(description).trim() : null;
  }

  try {
    const updated = await prisma.portfolio.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update portfolio.' },
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

  if (ds.isManager) {
    return NextResponse.json(
      { error: 'Managers cannot delete portfolios.' },
      { status: 403 },
    );
  }

  const existing = await prisma.portfolio.findFirst({
    where: { id, ownerId: ds.ownerId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Portfolio not found or unauthorized' },
      { status: 404 },
    );
  }

  try {
    await prisma.portfolio.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete portfolio.' },
      { status: 500 },
    );
  }
}
