import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope, resolveEditAccess } from '@/lib/manager-access';
import { getOwnedUtilityAccount, parseUtilityAccountInput } from '@/lib/utilities';

async function checkAccess(
  user: { id: string; role: string },
  account: { propertyId: string | null; subPropertyId: string | null },
) {
  if (user.role !== 'MANAGER') return null;
  const access = await resolveEditAccess(user, {
    propertyId: account.propertyId,
    subPropertyId: account.subPropertyId,
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

  const account = await getOwnedUtilityAccount(id, ds.ownerId);
  if (!account) {
    return NextResponse.json({ error: 'Utility account not found.' }, { status: 404 });
  }
  const denied = await checkAccess(session.user, account);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = parseUtilityAccountInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const updated = await prisma.utilityAccount.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ account: updated });
  } catch (err) {
    console.error('Failed to update utility account:', err);
    return NextResponse.json(
      { error: 'Failed to update account. Please try again.' },
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

  const account = await getOwnedUtilityAccount(id, ds.ownerId);
  if (!account) {
    return NextResponse.json({ error: 'Utility account not found.' }, { status: 404 });
  }
  const denied = await checkAccess(session.user, account);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  try {
    // A single transaction: bills cascade-delete with their account, kept
    // explicit here rather than relying on an implicit ON DELETE behavior.
    await prisma.$transaction([
      prisma.utilityBill.deleteMany({ where: { utilityAccountId: id } }),
      prisma.utilityAccount.delete({ where: { id } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to delete utility account:', err);
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again.' },
      { status: 500 },
    );
  }
}
