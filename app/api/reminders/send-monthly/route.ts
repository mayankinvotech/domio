import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendAllOwnerRentReminders, sendSingleRentReminder } from '@/lib/rent-reminders';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenantId } = body;

    // If specific tenant requested
    if (tenantId) {
      const result = await sendSingleRentReminder({ tenantId, manual: true });
      return NextResponse.json(result);
    }

    // Bulk monthly dispatch for all active tenants of this owner
    const summary = await sendAllOwnerRentReminders(session.user.id);
    return NextResponse.json({
      success: true,
      message: `Dispatched ${summary.totalSent} rent reminders (${summary.totalSkipped} skipped per owner settings).`,
      summary,
    });
  } catch (error: any) {
    console.error('Rent reminders trigger error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch reminders' },
      { status: 500 },
    );
  }
}
