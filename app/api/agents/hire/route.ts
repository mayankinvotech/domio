import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const body = await req.json().catch(() => ({}));
    const {
      agentId,
      clientName,
      clientPhone,
      clientEmail,
      clientRole = 'OWNER',
      location,
      propertyType,
      serviceNeeded,
      budgetOrRent,
      notes,
    } = body;

    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required.' }, { status: 400 });
    }

    if (!clientName || !clientPhone) {
      return NextResponse.json(
        { error: 'Name and Phone number are required to submit a request.' },
        { status: 400 },
      );
    }

    if (!serviceNeeded) {
      return NextResponse.json(
        { error: 'Please select what service you need from the agent.' },
        { status: 400 },
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });
    }

    const hiring = await prisma.agentHiring.create({
      data: {
        agentId,
        clientUserId: session?.user?.id || null,
        clientRole: String(clientRole).toUpperCase(),
        clientName: String(clientName).trim(),
        clientPhone: String(clientPhone).trim(),
        clientEmail: clientEmail ? String(clientEmail).trim() : null,
        location: location ? String(location).trim() : agent.location,
        propertyType: propertyType ? String(propertyType).trim() : null,
        serviceNeeded: String(serviceNeeded).trim(),
        budgetOrRent: budgetOrRent ? Number(budgetOrRent) : null,
        notes: notes ? String(notes).trim() : null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Hiring request submitted successfully! The agent will contact you shortly.',
        hiring,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Agent hiring error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit request' },
      { status: 500 },
    );
  }
}
