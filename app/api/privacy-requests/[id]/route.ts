import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { RequestStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status } = body;

    const existing = await prisma.privacyRequest.findUnique({
      where: { id },
      include: {
        sender: { select: { phone: true, email: true } },
        receiver: { select: { phone: true, email: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Only receiver can ACCEPT or DECLINE. Sender can CANCEL.
    if (status === 'CANCELLED') {
      if (existing.senderId !== userId) {
        return NextResponse.json({ error: 'Only the sender can cancel this request' }, { status: 403 });
      }
    } else {
      if (existing.receiverId !== userId) {
        return NextResponse.json({ error: 'Only the recipient can respond to this request' }, { status: 403 });
      }
    }

    const validStatuses: RequestStatus[] = ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status as RequestStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await prisma.privacyRequest.update({
      where: { id },
      data: { status: status as RequestStatus },
    });

    return NextResponse.json({
      success: true,
      request: updated,
      revealedContact: status === 'ACCEPTED' ? {
        senderPhone: existing.senderPhone,
        senderEmail: existing.senderEmail,
        receiverPhone: existing.receiver.phone,
        receiverEmail: existing.receiver.email,
      } : null,
    });
  } catch (error: any) {
    console.error('Update privacy request error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update request' },
      { status: 500 },
    );
  }
}
