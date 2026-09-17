import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope, resolveEditAccess } from '@/lib/manager-access';
import { getOwnedUtilityAccount, parseBillInput } from '@/lib/utilities';
import type { BillStatus } from '@prisma/client';

// New bills start UNPAID unless the due date has already passed (matches
// the OVERDUE flip that markOverdueBills applies on every list fetch).
function initialBillStatus(dueDate: Date): BillStatus {
  return dueDate < new Date() ? 'OVERDUE' : 'UNPAID';
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);
  const { searchParams } = new URL(request.url);
  const utilityAccountId = searchParams.get('utilityAccountId');
  if (!utilityAccountId) {
    return NextResponse.json({ error: 'utilityAccountId is required.' }, { status: 400 });
  }

  const account = await getOwnedUtilityAccount(utilityAccountId, ds.ownerId);
  if (!account) {
    return NextResponse.json({ error: 'Utility account not found.' }, { status: 404 });
  }

  const bills = await prisma.utilityBill.findMany({
    where: { utilityAccountId },
    orderBy: { dueDate: 'desc' },
    select: {
      id: true,
      billDate: true,
      dueDate: true,
      amount: true,
      amountPaid: true,
      status: true,
      paymentMethod: true,
      notes: true,
    },
  });
  return NextResponse.json({ bills });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ds = await resolveDataScope(session.user);
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const utilityAccountId = body.utilityAccountId;
  if (typeof utilityAccountId !== 'string' || !utilityAccountId) {
    return NextResponse.json({ error: 'A utility account is required.' }, { status: 400 });
  }
  const account = await getOwnedUtilityAccount(utilityAccountId, ds.ownerId);
  if (!account) {
    return NextResponse.json({ error: 'Utility account not found.' }, { status: 404 });
  }

  if (ds.isManager) {
    const access = await resolveEditAccess(session.user, {
      propertyId: account.propertyId,
      subPropertyId: account.subPropertyId,
    });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }

  const parsed = parseBillInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const bill = await prisma.utilityBill.create({
      data: {
        utilityAccountId,
        ownerId: ds.ownerId,
        billDate: parsed.data.billDate,
        dueDate: parsed.data.dueDate,
        amount: parsed.data.amount,
        amountPaid: 0,
        notes: parsed.data.notes,
        status: initialBillStatus(parsed.data.dueDate),
      },
    });
    return NextResponse.json({ bill }, { status: 201 });
  } catch (err) {
    console.error('Failed to create utility bill:', err);
    return NextResponse.json(
      { error: 'Failed to create bill. Please try again.' },
      { status: 500 },
    );
  }
}
