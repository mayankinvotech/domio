import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { PrivacyRequestType } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const senderId = session.user.id;
    const body = await req.json().catch(() => ({}));
    const {
      receiverId,
      receiverRole = 'OWNER',
      receiverName,
      requestType = 'RENT_REQUEST',
      propertyId,
      propertyName,
      location,
      propertyType,
      proposedRentOrFee,
      message,
    } = body;

    if (!receiverId) {
      return NextResponse.json({ error: 'Recipient is required.' }, { status: 400 });
    }

    if (senderId === receiverId) {
      return NextResponse.json(
        { error: 'You cannot send a request to yourself.' },
        { status: 400 },
      );
    }

    // Fetch sender user details
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { name: true, phone: true, email: true, role: true, location: true },
    });

    if (!sender) {
      return NextResponse.json({ error: 'Sender user not found.' }, { status: 404 });
    }

    const validTypes: PrivacyRequestType[] = ['RENT_REQUEST', 'OFFER_RENT', 'HIRE_AGENT'];
    const chosenType: PrivacyRequestType = validTypes.includes(requestType as PrivacyRequestType)
      ? (requestType as PrivacyRequestType)
      : 'RENT_REQUEST';

    const newRequest = await prisma.privacyRequest.create({
      data: {
        requestType: chosenType,
        senderId,
        senderRole: sender.role,
        senderName: sender.name,
        senderPhone: sender.phone || 'Not provided',
        senderEmail: sender.email,
        receiverId,
        receiverRole: String(receiverRole).toUpperCase(),
        receiverName: receiverName || 'Recipient',
        propertyId: propertyId || null,
        propertyName: propertyName || null,
        location: location || sender.location || 'Not specified',
        propertyType: propertyType || null,
        proposedRentOrFee: proposedRentOrFee ? Number(proposedRentOrFee) : null,
        message: message ? String(message).trim() : null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Request sent successfully with privacy protection! Your contact details will be shared once the request is accepted.',
        request: newRequest,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Privacy request create error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send request' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [received, sent] = await Promise.all([
      prisma.privacyRequest.findMany({
        where: { receiverId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: { id: true, name: true, location: true, role: true },
          },
          property: {
            select: { id: true, name: true, customType: true, city: true },
          },
        },
      }),
      prisma.privacyRequest.findMany({
        where: { senderId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          receiver: {
            select: { id: true, name: true, location: true, role: true, phone: true, email: true },
          },
          property: {
            select: { id: true, name: true, customType: true, city: true },
          },
        },
      }),
    ]);

    // Mask contact details if status is not ACCEPTED
    const formattedReceived = received.map((r) => {
      const isAccepted = r.status === 'ACCEPTED';
      return {
        id: r.id,
        requestType: r.requestType,
        senderId: r.senderId,
        senderName: r.senderName,
        senderRole: r.senderRole,
        senderLocation: r.sender.location,
        senderPhone: isAccepted ? r.senderPhone : '🔒 Hidden until accepted',
        senderEmail: isAccepted ? r.senderEmail : '🔒 Hidden until accepted',
        location: r.location,
        propertyType: r.propertyType,
        propertyName: r.propertyName || r.property?.name,
        propertyId: r.propertyId,
        proposedRentOrFee: r.proposedRentOrFee,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      };
    });

    const formattedSent = sent.map((s) => {
      const isAccepted = s.status === 'ACCEPTED';
      return {
        id: s.id,
        requestType: s.requestType,
        receiverId: s.receiverId,
        receiverName: s.receiverName,
        receiverRole: s.receiverRole,
        receiverLocation: s.receiver.location,
        receiverPhone: isAccepted ? (s.receiver.phone || 'Not provided') : '🔒 Hidden until accepted',
        receiverEmail: isAccepted ? s.receiver.email : '🔒 Hidden until accepted',
        location: s.location,
        propertyType: s.propertyType,
        propertyName: s.propertyName || s.property?.name,
        propertyId: s.propertyId,
        proposedRentOrFee: s.proposedRentOrFee,
        message: s.message,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      received: formattedReceived,
      sent: formattedSent,
      pendingCount: received.filter((r) => r.status === 'PENDING').length,
    });
  } catch (error: any) {
    console.error('Privacy request get error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch requests' },
      { status: 500 },
    );
  }
}
