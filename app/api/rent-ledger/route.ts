import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope, resolveRentLedgerAccess } from '@/lib/manager-access';
import { computeRentStatus } from '@/lib/rent-ledger';
import { loadActor, recordAudit } from '@/lib/audit';

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

  const { tenancyId, dueDate, amountDue } = body as Record<string, unknown>;
  if (typeof tenancyId !== 'string' || !tenancyId) {
    return NextResponse.json({ error: 'A tenancy is required.' }, { status: 400 });
  }
  const due = typeof dueDate === 'string' ? new Date(dueDate) : null;
  if (!due || Number.isNaN(due.getTime())) {
    return NextResponse.json({ error: 'A valid due date is required.' }, { status: 400 });
  }
  const amt = typeof amountDue === 'number' ? amountDue : Number(amountDue);
  if (!Number.isFinite(amt) || amt <= 0) {
    return NextResponse.json({ error: 'A valid amount due is required.' }, { status: 400 });
  }

  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    select: { id: true, ownerId: true, subPropertyId: true, rentableEntityId: true },
  });
  if (!tenancy || tenancy.ownerId !== ds.ownerId) {
    return NextResponse.json({ error: 'Tenancy not found.' }, { status: 404 });
  }

  const access = await resolveRentLedgerAccess(session.user, {
    subPropertyId: tenancy.subPropertyId,
  });
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const actor = await loadActor(session.user.id);
    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.rentLedger.create({
        data: {
          tenancyId,
          ownerId: ds.ownerId,
          dueDate: due,
          amountDue: amt,
          amountPaid: 0,
          status: computeRentStatus({ amountDue: amt, amountPaid: 0, dueDate: due }),
        },
      });
      await recordAudit(tx, {
        entity: 'RENT_LEDGER',
        entityId: created.id,
        action: 'CREATE',
        actor,
        ctx: {
          ownerId: ds.ownerId,
          subPropertyId: tenancy.subPropertyId,
          rentableEntityId: tenancy.rentableEntityId,
          tenancyId,
        },
        before: null,
        after: created,
      });
      return created;
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    console.error('Failed to create rent ledger entry:', err);
    return NextResponse.json(
      { error: 'Failed to add entry. Please try again.' },
      { status: 500 },
    );
  }
}
