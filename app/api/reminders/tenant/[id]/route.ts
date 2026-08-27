import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { toggleTenantReminderSettings, sendSingleRentReminder } from '@/lib/rent-reminders';

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
    const { enabled, daysBefore } = body;

    const result = await toggleTenantReminderSettings({
      tenantId: id,
      enabled: Boolean(enabled),
      daysBefore: daysBefore !== undefined ? Number(daysBefore) : undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update reminder settings' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await sendSingleRentReminder({ tenantId: id, manual: true });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to send reminder' },
      { status: 500 },
    );
  }
}
