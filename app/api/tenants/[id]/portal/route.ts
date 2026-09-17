import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { sendPlainSms } from '@/lib/twilio';

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

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true, ownerId: true, phone: true, name: true, portalEnabled: true },
  });
  if (!tenant || tenant.ownerId !== ds.ownerId) {
    return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.portalEnabled !== 'boolean') {
    return NextResponse.json(
      { error: 'A valid portalEnabled flag is required.' },
      { status: 400 },
    );
  }

  try {
    await prisma.tenant.update({
      where: { id },
      data: { portalEnabled: body.portalEnabled },
    });

    let smsSent = false;
    if (body.portalEnabled && !tenant.portalEnabled) {
      const result = await sendPlainSms(
        tenant.phone,
        `Hi ${tenant.name}, your Domio tenant portal access is now enabled. Log in anytime to view your lease and payment history.`,
      );
      smsSent = result.sent;
    }

    return NextResponse.json({ success: true, smsSent });
  } catch (err) {
    console.error('Failed to update tenant portal access:', err);
    return NextResponse.json(
      { error: 'Failed to update portal access. Please try again.' },
      { status: 500 },
    );
  }
}
