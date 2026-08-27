import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { username } = await params;
  const clean = username.trim().toLowerCase().replace(/^@/, '');

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { username: clean },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        email: true,
        location: true,
        nationalId: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: `No registered tenant found with handle "@${clean}".` },
        { status: 404 },
      );
    }

    return NextResponse.json({ tenant });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to find tenant' },
      { status: 500 },
    );
  }
}
