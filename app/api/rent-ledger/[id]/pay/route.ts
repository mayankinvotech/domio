import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope, resolveRentLedgerAccess } from '@/lib/manager-access';
import {
  RENT_LEDGER_MUTABLE_SELECT,
  computeRentStatus,
  parsePaymentInput,
} from '@/lib/rent-ledger';
import { loadActor, recordAudit } from '@/lib/audit';

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

  const entry = await prisma.rentLedger.findUnique({
    where: { id },
    select: RENT_LEDGER_MUTABLE_SELECT,
  });
  if (!entry || entry.ownerId !== ds.ownerId) {
    return NextResponse.json({ error: 'Rent ledger entry not found.' }, { status: 404 });
  }

  const access = await resolveRentLedgerAccess(session.user, {
    subPropertyId: entry.tenancy.subPropertyId,
  });
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = parsePaymentInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Payments accumulate rather than replace — a partial payment followed by
  // another partial payment should add up, not overwrite.
  const newAmountPaid = entry.amountPaid + parsed.data.amountPaid;
  const status = computeRentStatus({
    amountDue: entry.amountDue,
    amountPaid: newAmountPaid,
    dueDate: entry.dueDate,
  });

  try {
    const actor = await loadActor(session.user.id);
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.rentLedger.update({
        where: { id },
        data: {
          amountPaid: newAmountPaid,
          paidDate: parsed.data.paidDate,
          rentFor: parsed.data.rentFor,
          reference: parsed.data.reference,
          notes: parsed.data.notes,
          paymentMethod: parsed.data.paymentMethod,
          status,
        },
      });
      await recordAudit(tx, {
        entity: 'RENT_LEDGER',
        entityId: id,
        action: 'UPDATE',
        actor,
        ctx: {
          ownerId: ds.ownerId,
          subPropertyId: entry.tenancy.subPropertyId,
          rentableEntityId: entry.tenancy.rentableEntityId,
          tenancyId: entry.tenancyId,
        },
        before: entry,
        after: row,
        reason: 'Payment recorded',
      });
      return row;
    });
    return NextResponse.json({ entry: updated });
  } catch (err) {
    console.error('Failed to record payment:', err);
    return NextResponse.json(
      { error: 'Failed to record payment. Please try again.' },
      { status: 500 },
    );
  }
}
