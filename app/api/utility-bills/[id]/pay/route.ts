import { NextResponse } from 'next/server';
import type { BillStatus } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope, resolveEditAccess } from '@/lib/manager-access';
import { parseBillPaymentInput } from '@/lib/utilities';

function computeStatus(amount: number, amountPaid: number, dueDate: Date): BillStatus {
  if (amountPaid >= amount && amount > 0) return 'PAID';
  if (amountPaid > 0) return 'PARTIAL';
  return dueDate < new Date() ? 'OVERDUE' : 'UNPAID';
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

  const full = await prisma.utilityBill.findUnique({
    where: { id },
    select: {
      ownerId: true,
      amount: true,
      amountPaid: true,
      dueDate: true,
      utilityAccount: { select: { propertyId: true, subPropertyId: true } },
    },
  });
  if (!full || full.ownerId !== ds.ownerId) {
    return NextResponse.json({ error: 'Utility bill not found.' }, { status: 404 });
  }

  if (ds.isManager) {
    const access = await resolveEditAccess(session.user, {
      propertyId: full.utilityAccount.propertyId,
      subPropertyId: full.utilityAccount.subPropertyId,
    });
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = parseBillPaymentInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const newAmountPaid = full.amountPaid + parsed.data.amountPaid;
  const status = computeStatus(full.amount, newAmountPaid, full.dueDate);

  try {
    const updated = await prisma.utilityBill.update({
      where: { id },
      data: {
        amountPaid: newAmountPaid,
        paidDate: parsed.data.paidDate,
        paymentMethod: parsed.data.paymentMethod,
        status,
      },
    });
    return NextResponse.json({ bill: updated });
  } catch (err) {
    console.error('Failed to record bill payment:', err);
    return NextResponse.json(
      { error: 'Failed to record payment. Please try again.' },
      { status: 500 },
    );
  }
}
