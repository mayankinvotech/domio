import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope, resolveEditAccess } from '@/lib/manager-access';
import { parseUtilityAccountInput, resolveUtilityTarget } from '@/lib/utilities';
import type { UtilityLevel } from '@/lib/utility-types';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const level = body.level as UtilityLevel;
  const targetId = body.targetId;
  if (
    (level !== 'PORTFOLIO' && level !== 'PROPERTY' && level !== 'UNIT') ||
    !targetId ||
    typeof targetId !== 'string'
  ) {
    return NextResponse.json(
      { error: 'A valid level and targetId are required.' },
      { status: 400 },
    );
  }

  const ds = await resolveDataScope(session.user);
  if (ds.isManager) {
    if (level === 'PORTFOLIO') {
      return NextResponse.json(
        { error: 'Managers cannot create portfolio-level utility accounts.' },
        { status: 403 },
      );
    }
    const access = await resolveEditAccess(session.user, {
      propertyId: level === 'PROPERTY' ? targetId : undefined,
      subPropertyId: level === 'UNIT' ? targetId : undefined,
    });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }

  const target = await resolveUtilityTarget(ds.ownerId, level, targetId);
  if ('error' in target) {
    return NextResponse.json({ error: target.error }, { status: 404 });
  }

  const parsed = parseUtilityAccountInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const account = await prisma.utilityAccount.create({
      data: { ownerId: ds.ownerId, ...target.data, ...parsed.data },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    console.error('Failed to create utility account:', err);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 },
    );
  }
}
