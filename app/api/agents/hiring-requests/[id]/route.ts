import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { AgentHiringStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status } = body;

    const agent = await prisma.agent.findUnique({
      where: { userId: session.user.id },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent profile not found' }, { status: 403 });
    }

    const hiring = await prisma.agentHiring.findFirst({
      where: { id, agentId: agent.id },
    });

    if (!hiring) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const validStatuses: AgentHiringStatus[] = ['PENDING', 'ACCEPTED', 'COMPLETED', 'DECLINED'];
    if (!status || !validStatuses.includes(status as AgentHiringStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await prisma.agentHiring.update({
      where: { id },
      data: { status: status as AgentHiringStatus },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update status' },
      { status: 500 },
    );
  }
}
