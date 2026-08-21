import type { EmailTemplate } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import {
  paymentReceivedTemplate,
  rentOverdueTemplate,
  leaseExpiryTemplate,
  welcomeOwnerTemplate,
  utilityOverdueTemplate,
} from '@/lib/email-templates';
import { formatDate } from '@/lib/tenancy-types';
import { paymentMethodLabel } from '@/lib/payment-method-types';
import { utilityTypeLabel } from '@/lib/utility-types';

const DAY = 86_400_000;

async function logEmail(params: {
  ownerId: string;
  recipientEmail: string;
  subject: string;
  templateType: EmailTemplate;
  entityId?: string | null;
  entityType?: string | null;
  result: { success: boolean; id?: string; error?: string };
}): Promise<void> {
  await prisma.emailLog.create({
    data: {
      ownerId: params.ownerId,
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      templateType: params.templateType,
      entityId: params.entityId ?? null,
      entityType: params.entityType ?? null,
      resendId: params.result.id ?? null,
      status: params.result.success ? 'SENT' : 'FAILED',
      error: params.result.error ?? null,
    },
  });
}

// Deliver a payment confirmation to every recipient separately (so the tenant
// and owner never see each other's address) and log each send. Blanks and
// case-insensitive duplicates are skipped.
async function deliverPaymentConfirmation(params: {
  ownerId: string;
  recipients: (string | null | undefined)[];
  content: { subject: string; html: string; text: string };
  entityId: string;
  entityType: string;
}): Promise<void> {
  const seen = new Set<string>();
  for (const raw of params.recipients) {
    const to = raw?.trim();
    if (!to || seen.has(to.toLowerCase())) continue;
    seen.add(to.toLowerCase());
    const result = await sendEmail({ to, ...params.content });
    await logEmail({
      ownerId: params.ownerId,
      recipientEmail: to,
      subject: params.content.subject,
      templateType: 'PAYMENT_RECEIVED',
      entityId: params.entityId,
      entityType: params.entityType,
      result,
    });
  }
}

// ── Payment received (unit-page Rent Ledger journal) → tenant + owner ────────
// Fired when a PAYMENT-type LedgerEntry is created. Mirrors the RentLedger
// /pay confirmation; the journal has no method/reference fields, so those
// details are omitted. Caller guarantees the entry is a PAYMENT.
export async function sendLedgerPaymentReceivedEmail(
  ledgerEntryId: string,
): Promise<void> {
  const entry = await prisma.ledgerEntry.findUnique({
    where: { id: ledgerEntryId },
    select: {
      type: true,
      amount: true,
      date: true,
      description: true,
      tenancy: {
        select: {
          ownerId: true,
          tenant: { select: { name: true, email: true } },
          subProperty: {
            select: {
              name: true,
              displayId: true,
              property: { select: { name: true } },
            },
          },
          rentableEntity: {
            select: {
              name: true,
              displayId: true,
              property: { select: { name: true } },
            },
          },
        },
      },
      // owner (for accountId + notification prefs) is on the tenancy relation
      // above via ownerId; load config through the tenancy's owner.
    },
  });
  if (!entry || entry.type !== 'PAYMENT') return;

  const owner = await prisma.user.findUnique({
    where: { id: entry.tenancy.ownerId },
    select: { email: true, accountId: true, notificationConfig: true },
  });
  const cfg = owner?.notificationConfig;
  if (cfg && (!cfg.emailEnabled || !cfg.paymentConfirmEnabled)) return;

  const t = entry.tenancy;
  const unitName = t.subProperty?.name ?? t.rentableEntity?.name ?? 'Unit';
  const propertyName = t.subProperty?.property?.name ?? t.rentableEntity?.property?.name ?? '';
  const unitDisplayId = t.subProperty?.displayId ?? t.rentableEntity?.displayId ?? null;

  // A LedgerEntry PAYMENT is stored positive; show the magnitude.
  const content = paymentReceivedTemplate({
    tenantName: t.tenant.name,
    unitName,
    propertyName,
    amount: Math.abs(entry.amount),
    paidDate: formatDate(entry.date),
    paymentMethod: '—',
    reference: entry.description || null,
    unitDisplayId,
    accountId: owner?.accountId ?? null,
  });

  // Confirm to the tenant and copy the property owner.
  await deliverPaymentConfirmation({
    ownerId: t.ownerId,
    recipients: [t.tenant.email, owner?.email],
    content,
    entityId: ledgerEntryId,
    entityType: 'LEDGER_ENTRY',
  });
}

// ── Payment received → tenant ────────────────────────────────────────────────
export async function sendPaymentReceivedEmail(
  rentLedgerId: string,
): Promise<void> {
  const entry = await prisma.rentLedger.findUnique({
    where: { id: rentLedgerId },
    select: {
      ownerId: true,
      amountPaid: true,
      paidDate: true,
      reference: true,
      paymentMethod: true,
      tenancy: {
        select: {
          tenant: { select: { name: true, email: true } },
          subProperty: {
            select: {
              name: true,
              displayId: true,
              property: { select: { name: true } },
            },
          },
          rentableEntity: {
            select: {
              name: true,
              displayId: true,
              property: { select: { name: true } },
            },
          },
        },
      },
      owner: {
        select: { email: true, accountId: true, notificationConfig: true },
      },
    },
  });
  if (!entry) return;
  const cfg = entry.owner.notificationConfig;
  if (cfg && (!cfg.emailEnabled || !cfg.paymentConfirmEnabled)) return;

  const t = entry.tenancy;
  const unitName = t.subProperty?.name ?? t.rentableEntity?.name ?? 'Unit';
  const propertyName = t.subProperty?.property?.name ?? t.rentableEntity?.property?.name ?? '';
  const unitDisplayId = t.subProperty?.displayId ?? t.rentableEntity?.displayId ?? null;

  const content = paymentReceivedTemplate({
    tenantName: t.tenant.name,
    unitName,
    propertyName,
    amount: entry.amountPaid,
    paidDate: entry.paidDate ? formatDate(entry.paidDate) : '—',
    paymentMethod: entry.paymentMethod
      ? paymentMethodLabel(entry.paymentMethod)
      : '—',
    reference: entry.reference,
    unitDisplayId,
    accountId: entry.owner.accountId,
  });

  // Confirm to the tenant and copy the property owner.
  await deliverPaymentConfirmation({
    ownerId: entry.ownerId,
    recipients: [t.tenant.email, entry.owner.email],
    content,
    entityId: rentLedgerId,
    entityType: 'RENT_LEDGER',
  });
}

// ── Rent overdue → tenant ────────────────────────────────────────────────────
export async function sendRentOverdueEmail(
  rentLedgerId: string,
): Promise<void> {
  const entry = await prisma.rentLedger.findUnique({
    where: { id: rentLedgerId },
    select: {
      ownerId: true,
      amountDue: true,
      amountPaid: true,
      dueDate: true,
      tenancy: {
        select: {
          tenant: { select: { name: true, email: true } },
          subProperty: {
            select: {
              name: true,
              displayId: true,
              property: { select: { name: true } },
            },
          },
          rentableEntity: {
            select: {
              name: true,
              displayId: true,
              property: { select: { name: true } },
            },
          },
        },
      },
      owner: { select: { accountId: true, notificationConfig: true } },
    },
  });
  if (!entry) return;
  const cfg = entry.owner.notificationConfig;
  if (cfg && (!cfg.emailEnabled || !cfg.rentReminderEnabled)) return;

  const t = entry.tenancy;
  const unitName = t.subProperty?.name ?? t.rentableEntity?.name ?? 'Unit';
  const propertyName = t.subProperty?.property?.name ?? t.rentableEntity?.property?.name ?? '';
  const unitDisplayId = t.subProperty?.displayId ?? t.rentableEntity?.displayId ?? null;

  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - entry.dueDate.getTime()) / DAY),
  );
  const { html, text, subject } = rentOverdueTemplate({
    tenantName: t.tenant.name,
    unitName,
    propertyName,
    amountDue: entry.amountDue,
    amountPaid: entry.amountPaid,
    balance: entry.amountDue - entry.amountPaid,
    dueDate: formatDate(entry.dueDate),
    daysOverdue,
    unitDisplayId,
    accountId: entry.owner.accountId,
  });

  if (!t.tenant.email) return;
  const result = await sendEmail({ to: t.tenant.email, subject, html, text });
  await logEmail({
    ownerId: entry.ownerId,
    recipientEmail: t.tenant.email,
    subject,
    templateType: 'RENT_OVERDUE_REMINDER',
    entityId: rentLedgerId,
    entityType: 'RENT_LEDGER',
    result,
  });
}

// ── Lease expiry → tenant ────────────────────────────────────────────────────
export async function sendLeaseExpiryEmail(
  tenancyId: string,
  daysRemaining: number,
): Promise<void> {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    select: {
      ownerId: true,
      endDate: true,
      monthlyRent: true,
      tenant: { select: { name: true, email: true } },
      subProperty: {
        select: {
          name: true,
          displayId: true,
          property: { select: { name: true } },
        },
      },
      rentableEntity: {
        select: {
          name: true,
          displayId: true,
          property: { select: { name: true } },
        },
      },
      owner: { select: { accountId: true, notificationConfig: true } },
    },
  });
  if (!tenancy) return;
  const cfg = tenancy.owner.notificationConfig;
  if (cfg && (!cfg.emailEnabled || !cfg.leaseExpiryEnabled)) return;

  const unitName = tenancy.subProperty?.name ?? tenancy.rentableEntity?.name ?? 'Unit';
  const propertyName = tenancy.subProperty?.property?.name ?? tenancy.rentableEntity?.property?.name ?? '';
  const unitDisplayId = tenancy.subProperty?.displayId ?? tenancy.rentableEntity?.displayId ?? null;

  const { html, text, subject } = leaseExpiryTemplate({
    tenantName: tenancy.tenant.name,
    unitName,
    propertyName,
    leaseEndDate: formatDate(tenancy.endDate),
    daysRemaining,
    monthlyRent: tenancy.monthlyRent,
    unitDisplayId,
    accountId: tenancy.owner.accountId,
  });

  if (!tenancy.tenant.email) return;
  const result = await sendEmail({
    to: tenancy.tenant.email,
    subject,
    html,
    text,
  });
  await logEmail({
    ownerId: tenancy.ownerId,
    recipientEmail: tenancy.tenant.email,
    subject,
    templateType: 'LEASE_EXPIRY_WARNING',
    entityId: tenancyId,
    entityType: 'TENANCY',
    result,
  });
}

// ── Welcome → new owner ──────────────────────────────────────────────────────
export async function sendWelcomeEmail(
  userId: string,
  temporaryPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      accountId: true,
      notificationConfig: true,
    },
  });
  if (!user) return;
  const cfg = user.notificationConfig;
  if (cfg && (!cfg.emailEnabled || !cfg.welcomeEmailEnabled)) return;

  const { html, text, subject } = welcomeOwnerTemplate({
    ownerName: user.name,
    email: user.email,
    accountId: user.accountId,
    temporaryPassword,
  });

  const result = await sendEmail({ to: user.email, subject, html, text });
  await logEmail({
    ownerId: userId,
    recipientEmail: user.email,
    subject,
    templateType: 'WELCOME_OWNER',
    entityId: userId,
    entityType: 'USER',
    result,
  });
}

// ── Utility bill overdue → owner ─────────────────────────────────────────────
export async function sendUtilityOverdueEmail(
  utilityBillId: string,
): Promise<void> {
  const bill = await prisma.utilityBill.findUnique({
    where: { id: utilityBillId },
    select: {
      ownerId: true,
      amount: true,
      amountPaid: true,
      dueDate: true,
      utilityAccount: {
        select: {
          type: true,
          provider: true,
          accountNumber: true,
          property: { select: { name: true } },
          subProperty: { select: { property: { select: { name: true } } } },
          portfolio: { select: { name: true } },
        },
      },
      owner: { select: { name: true, email: true, accountId: true, notificationConfig: true } },
    },
  });
  if (!bill) return;
  const cfg = bill.owner.notificationConfig;
  if (cfg && (!cfg.emailEnabled || !cfg.utilityReminderEnabled)) return;

  const acct = bill.utilityAccount;
  const propertyName =
    acct.property?.name ??
    acct.subProperty?.property.name ??
    acct.portfolio?.name ??
    'Portfolio-level';
  const daysOverdue = Math.max(
    0,
    Math.floor((Date.now() - bill.dueDate.getTime()) / DAY),
  );

  const { html, text, subject } = utilityOverdueTemplate({
    ownerName: bill.owner.name,
    utilityType: utilityTypeLabel(acct.type),
    provider: acct.provider,
    accountNumber: acct.accountNumber,
    propertyName,
    amount: bill.amount - bill.amountPaid,
    dueDate: formatDate(bill.dueDate),
    daysOverdue,
    accountId: bill.owner.accountId,
  });

  const result = await sendEmail({ to: bill.owner.email, subject, html, text });
  await logEmail({
    ownerId: bill.ownerId,
    recipientEmail: bill.owner.email,
    subject,
    templateType: 'UTILITY_BILL_OVERDUE',
    entityId: utilityBillId,
    entityType: 'UTILITY_BILL',
    result,
  });
}
