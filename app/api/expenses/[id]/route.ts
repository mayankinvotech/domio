import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope, resolveEditAccess } from '@/lib/manager-access';
import { getOwnedExpense, parseExpenseFields } from '@/lib/expenses';

async function checkAccess(
  user: { id: string; role: string },
  expense: { propertyId: string | null; subPropertyId: string | null },
) {
  if (user.role !== 'MANAGER') return null;
  const access = await resolveEditAccess(user, {
    propertyId: expense.propertyId,
    subPropertyId: expense.subPropertyId,
  });
  if ('error' in access) return access;
  return null;
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

  const expense = await getOwnedExpense(id, ds.ownerId);
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
  }

  const denied = await checkAccess(session.user, expense);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = parseExpenseFields(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const updated = await prisma.expense.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ expense: updated });
  } catch (err) {
    console.error('Failed to update expense:', err);
    return NextResponse.json(
      { error: 'Failed to update expense. Please try again.' },
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

  const expense = await getOwnedExpense(id, ds.ownerId);
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
  }

  const denied = await checkAccess(session.user, expense);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  try {
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete expense:', err);
    return NextResponse.json(
      { error: 'Failed to delete expense. Please try again.' },
      { status: 500 },
    );
  }
}
