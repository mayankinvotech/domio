import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope, resolveEditAccess } from '@/lib/manager-access';
import { parseExpenseFields, resolveExpenseTarget } from '@/lib/expenses';
import type { ExpenseLevel } from '@/lib/expense-types';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const level = body.level as ExpenseLevel;
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

  // Managers may only log expenses against a unit/property they can edit.
  if (ds.isManager) {
    const access = await resolveEditAccess(session.user, {
      propertyId: level === 'PROPERTY' ? targetId : undefined,
      subPropertyId: level === 'UNIT' ? targetId : undefined,
    });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (level === 'PORTFOLIO') {
      return NextResponse.json(
        { error: 'Managers cannot log portfolio-level expenses.' },
        { status: 403 },
      );
    }
  }

  const target = await resolveExpenseTarget(ds.ownerId, level, targetId);
  if ('error' in target) {
    return NextResponse.json({ error: target.error }, { status: 404 });
  }

  const parsed = parseExpenseFields(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const expense = await prisma.expense.create({
      data: {
        ownerId: ds.ownerId,
        ...target.data,
        ...parsed.data,
      },
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    console.error('Failed to create expense:', err);
    return NextResponse.json(
      { error: 'Failed to create expense. Please try again.' },
      { status: 500 },
    );
  }
}
