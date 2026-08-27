import { prisma } from '@/lib/prisma';
import { sendEmail, APP_URL } from '@/lib/email';
import { sendOtpSms } from '@/lib/twilio';

export async function sendSingleRentReminder({
  tenantId,
  targetMonth,
  manual = false,
}: {
  tenantId: string;
  targetMonth?: string;
  manual?: boolean;
}): Promise<{ success: boolean; message: string; stopped?: boolean }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      owner: { select: { id: true, name: true, phone: true, email: true } },
      tenancies: {
        where: { status: 'ACTIVE' },
        include: {
          subProperty: { select: { name: true, unitNumber: true, property: { select: { name: true, address: true } } } },
          rentableEntity: { select: { name: true, code: true, property: { select: { name: true, address: true } } } },
        },
      },
    },
  });

  if (!tenant) {
    return { success: false, message: 'Tenant not found.' };
  }

  // Check if owner stopped reminders for this tenant (only blocks automated reminders, manual can override or respect)
  if (!tenant.rentReminderEnabled && !manual) {
    await prisma.rentReminder.create({
      data: {
        tenantId: tenant.id,
        ownerId: tenant.ownerId || 'unknown',
        targetMonth: targetMonth || new Date().toISOString().slice(0, 7),
        dueDate: new Date(),
        amount: 0,
        status: 'STOPPED_BY_OWNER',
        errorMessage: 'Reminders disabled by owner for this tenant',
      },
    });
    return {
      success: true,
      stopped: true,
      message: `Rent reminder skipped: Reminders are paused by owner for ${tenant.name}.`,
    };
  }

  const activeTenancy = tenant.tenancies[0];
  if (!activeTenancy) {
    return { success: false, message: 'Tenant has no active lease.' };
  }

  const propertyName =
    activeTenancy.subProperty?.property.name ||
    activeTenancy.rentableEntity?.property.name ||
    'Your Rental Space';
  const unitName =
    activeTenancy.subProperty?.name ||
    activeTenancy.rentableEntity?.name ||
    'Unit';

  const monthlyRent = activeTenancy.monthlyRent;
  const currentMonthStr = targetMonth || new Date().toISOString().slice(0, 7);

  // Calculate upcoming due date (e.g. 1st or custom due day of the month)
  const now = new Date();
  const nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const formattedDueDate = nextDueDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const portalLink = `${APP_URL}/tenant-portal`;
  let emailSent = false;
  let smsSent = false;

  // 1. Send Email Reminder if tenant has email
  if (tenant.email) {
    const emailResult = await sendEmail({
      to: tenant.email,
      subject: `Upcoming Rent Reminder: ${propertyName} (${unitName})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background: #ffffff;">
          <div style="background: #09090b; padding: 14px 20px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 18px;">💳 Rent Payment Reminder</h2>
          </div>
          
          <p style="font-size: 15px; color: #27272a; margin-top: 0;">Dear <strong>${tenant.name}</strong>,</p>
          <p style="font-size: 14px; color: #52525b; line-height: 1.5;">
            This is a friendly reminder that your monthly rent for <strong>${propertyName} (${unitName})</strong> will be due on <strong>${formattedDueDate}</strong>.
          </p>

          <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="color: #71717a; padding: 4px 0;">Property:</td>
                <td style="font-weight: bold; color: #09090b; text-align: right;">${propertyName}</td>
              </tr>
              <tr>
                <td style="color: #71717a; padding: 4px 0;">Unit / Space:</td>
                <td style="font-weight: bold; color: #09090b; text-align: right;">${unitName}</td>
              </tr>
              <tr>
                <td style="color: #71717a; padding: 4px 0;">Monthly Rent Due:</td>
                <td style="font-weight: bold; color: #059669; font-size: 16px; text-align: right;">$${monthlyRent.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="color: #71717a; padding: 4px 0;">Due Date:</td>
                <td style="font-weight: bold; color: #09090b; text-align: right;">${formattedDueDate}</td>
              </tr>
            </table>
          </div>

          ${tenant.bankAccountNumber ? `
          <div style="background: #fafafa; border: 1px dashed #d4d4d8; border-radius: 8px; padding: 12px; font-size: 12px; color: #52525b; margin-bottom: 20px;">
            <strong>Bank Transfer Details:</strong><br/>
            Bank: ${tenant.bankName || 'Direct Account'}<br/>
            Account: ${tenant.bankAccountNumber}
          </div>
          ` : ''}

          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalLink}" style="display: inline-block; background: #09090b; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 14px;">
              Open Tenant Portal &amp; View Ledger →
            </a>
          </div>

          <p style="font-size: 11px; color: #a1a1aa; text-align: center; margin-bottom: 0;">
            This is an automated reminder. Landlords can adjust or pause reminder preferences in their dashboard for free at any time.
          </p>
        </div>
      `,
      text: `Hello ${tenant.name}, friendly reminder that rent of $${monthlyRent} for ${propertyName} (${unitName}) is due on ${formattedDueDate}. You can review your ledger at ${portalLink}`,
    });
    emailSent = emailResult.success;
  }

  // 2. Send SMS Reminder if tenant has phone
  if (tenant.phone) {
    const smsMessage = `Domio Rent Reminder: Hello ${tenant.name}, rent of $${monthlyRent.toLocaleString()} for ${propertyName} (${unitName}) is due on ${formattedDueDate}. View details: ${portalLink}`;
    const smsResult = await sendOtpSms(tenant.phone, smsMessage);
    smsSent = smsResult.sent;
  }

  // Log reminder
  await prisma.rentReminder.create({
    data: {
      tenantId: tenant.id,
      tenancyId: activeTenancy.id,
      ownerId: tenant.ownerId || 'unknown',
      targetMonth: currentMonthStr,
      dueDate: nextDueDate,
      amount: monthlyRent,
      channel: emailSent && smsSent ? 'BOTH' : emailSent ? 'EMAIL' : smsSent ? 'SMS' : 'FAILED',
      status: emailSent || smsSent ? 'SENT' : 'FAILED',
    },
  });

  return {
    success: emailSent || smsSent,
    message: `Rent reminder sent to ${tenant.name} (${emailSent ? 'Email ✓' : ''} ${smsSent ? 'SMS ✓' : ''})`,
  };
}

export async function sendAllOwnerRentReminders(ownerId: string): Promise<{
  totalSent: number;
  totalSkipped: number;
  results: Array<{ tenantName: string; status: string }>;
}> {
  const tenants = await prisma.tenant.findMany({
    where: {
      ownerId,
      tenancies: { some: { status: 'ACTIVE' } },
    },
  });

  let totalSent = 0;
  let totalSkipped = 0;
  const results: Array<{ tenantName: string; status: string }> = [];

  for (const t of tenants) {
    if (!t.rentReminderEnabled) {
      totalSkipped++;
      results.push({ tenantName: t.name, status: 'SKIPPED (Disabled by Owner)' });
      continue;
    }

    const res = await sendSingleRentReminder({ tenantId: t.id });
    if (res.success && !res.stopped) {
      totalSent++;
      results.push({ tenantName: t.name, status: 'SENT' });
    } else {
      results.push({ tenantName: t.name, status: res.message });
    }
  }

  return { totalSent, totalSkipped, results };
}

export async function toggleTenantReminderSettings({
  tenantId,
  enabled,
  daysBefore,
}: {
  tenantId: string;
  enabled: boolean;
  daysBefore?: number;
}): Promise<{ success: boolean; tenant: any }> {
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      rentReminderEnabled: enabled,
      ...(daysBefore !== undefined ? { rentReminderDaysBefore: Number(daysBefore) } : {}),
    },
  });

  return { success: true, tenant: updated };
}
