import { APP_URL } from '@/lib/email';

// ── Shared helpers ───────────────────────────────────────────────────────────

type Rendered = { html: string; text: string; subject: string };

const moneyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
function money(n: number): string {
  return moneyFmt.format(n);
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type Row = { label: string; value: string };

function detailsRows(rows: Row[]): string {
  return rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 0;color:#6A6A8A;font-size:13px;">${esc(r.label)}</td>
        <td style="padding:8px 0;color:#FFFFFF;font-size:13px;font-weight:600;text-align:right;">${esc(r.value)}</td>
      </tr>`,
    )
    .join('');
}

function detailsText(rows: Row[]): string {
  return rows.map((r) => `  ${r.label}: ${r.value}`).join('\n');
}

// Wraps body content in the branded dark shell.
function shell({
  heading,
  banner,
  bodyHtml,
  accountId,
}: {
  heading: string;
  banner?: { text: string; bg: string; border: string; color: string };
  bodyHtml: string;
  accountId: string | null;
}): string {
  const bannerHtml = banner
    ? `<div style="margin:0 0 20px;padding:12px 16px;border-radius:10px;background:${banner.bg};border:1px solid ${banner.border};color:${banner.color};font-size:14px;font-weight:600;">${esc(banner.text)}</div>`
    : '';
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0A0A0F;font-family:'Segoe UI',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0F;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding:0 0 20px;">
                <span style="font-size:22px;font-weight:900;letter-spacing:4px;color:#E8A020;">DOMIO</span>
              </td>
            </tr>
            <tr>
              <td style="background:#0E0C22;border:1px solid #1A1A2A;border-radius:16px;padding:28px;">
                <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#FFFFFF;">${esc(heading)}</h1>
                ${bannerHtml}
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 4px;color:#4A4A6A;font-size:12px;line-height:1.6;">
                ${accountId ? `Account ${esc(accountId)} · ` : ''}Domio Property Management<br/>
                You're receiving this because email notifications are enabled on your Domio account.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function p(html: string): string {
  return `<p style="margin:0 0 14px;color:#E8E8F2;font-size:14px;line-height:1.6;">${html}</p>`;
}

function table(rows: Row[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border-top:1px solid #1A1A2A;">${detailsRows(rows)}</table>`;
}

function footerText(accountId: string | null): string {
  return `\n\n—\n${accountId ? `Account ${accountId} · ` : ''}Domio Property Management`;
}

// ── Template 1: Payment Received ─────────────────────────────────────────────

export type PaymentReceivedData = {
  tenantName: string;
  unitName: string;
  propertyName: string;
  amount: number;
  paidDate: string;
  paymentMethod: string;
  reference: string | null;
  unitDisplayId: string | null;
  accountId: string | null;
};

export function paymentReceivedTemplate(d: PaymentReceivedData): Rendered {
  const subject = `✅ Payment Received — ${d.unitName}`;
  const rows: Row[] = [
    { label: 'Amount', value: money(d.amount) },
    { label: 'Date', value: d.paidDate },
    { label: 'Method', value: d.paymentMethod },
    { label: 'Reference', value: d.reference ?? '—' },
    ...(d.unitDisplayId ? [{ label: 'Unit ID', value: d.unitDisplayId }] : []),
  ];
  const bodyHtml =
    p(`Dear ${esc(d.tenantName)},`) +
    p(
      `We have received your payment of <strong style="color:#8B6FE8;">${money(d.amount)}</strong> for ${esc(d.unitName)}, ${esc(d.propertyName)}.`,
    ) +
    table(rows) +
    p('Thank you for your payment.');
  const html = shell({
    heading: 'Payment Received',
    banner: {
      text: '✅ Payment confirmed',
      bg: 'rgba(34,197,94,0.1)',
      border: 'rgba(34,197,94,0.3)',
      color: '#22c55e',
    },
    bodyHtml,
    accountId: d.accountId,
  });
  const text =
    `Payment Received\n\nDear ${d.tenantName},\n\nWe have received your payment of ${money(d.amount)} for ${d.unitName}, ${d.propertyName}.\n\n` +
    detailsText(rows) +
    `\n\nThank you for your payment.` +
    footerText(d.accountId);
  return { html, text, subject };
}

// ── Template 2: Rent Overdue Reminder ────────────────────────────────────────

export type RentOverdueData = {
  tenantName: string;
  unitName: string;
  propertyName: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  daysOverdue: number;
  unitDisplayId: string | null;
  accountId: string | null;
};

export function rentOverdueTemplate(d: RentOverdueData): Rendered {
  const subject = `⚠️ Rent Overdue — ${d.unitName} — ${d.daysOverdue} days`;
  const rows: Row[] = [
    { label: 'Amount Due', value: money(d.amountDue) },
    { label: 'Amount Paid', value: money(d.amountPaid) },
    { label: 'Balance', value: money(d.balance) },
    { label: 'Due Date', value: d.dueDate },
    { label: 'Days Overdue', value: `${d.daysOverdue}` },
    ...(d.unitDisplayId ? [{ label: 'Unit ID', value: d.unitDisplayId }] : []),
  ];
  const bodyHtml =
    p(`Dear ${esc(d.tenantName)},`) +
    p(
      `Your rent for ${esc(d.unitName)}, ${esc(d.propertyName)} is <strong style="color:#ef4444;">overdue</strong>.`,
    ) +
    table(rows) +
    p('Please arrange payment immediately.') +
    p(
      `<span style="color:#6A6A8A;">If you have already paid, please disregard this notice or contact your property manager.</span>`,
    );
  const html = shell({
    heading: 'Rent Overdue',
    banner: {
      text: `⚠️ ${d.daysOverdue} days overdue · ${money(d.balance)} outstanding`,
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.3)',
      color: '#ef4444',
    },
    bodyHtml,
    accountId: d.accountId,
  });
  const text =
    `Rent Overdue\n\nDear ${d.tenantName},\n\nYour rent for ${d.unitName}, ${d.propertyName} is overdue.\n\n` +
    detailsText(rows) +
    `\n\nPlease arrange payment immediately.` +
    footerText(d.accountId);
  return { html, text, subject };
}

// ── Template 3: Lease Expiry Warning ─────────────────────────────────────────

export type LeaseExpiryData = {
  tenantName: string;
  unitName: string;
  propertyName: string;
  leaseEndDate: string;
  daysRemaining: number;
  monthlyRent: number;
  unitDisplayId: string | null;
  accountId: string | null;
};

export function leaseExpiryTemplate(d: LeaseExpiryData): Rendered {
  const subject = `⚠️ Lease Expiring in ${d.daysRemaining} Days — ${d.unitName}`;
  const urgent = d.daysRemaining < 30;
  const rows: Row[] = [
    { label: 'Unit', value: d.unitName },
    { label: 'Property', value: d.propertyName },
    { label: 'End Date', value: d.leaseEndDate },
    { label: 'Days Remaining', value: `${d.daysRemaining}` },
    { label: 'Monthly Rent', value: money(d.monthlyRent) },
    ...(d.unitDisplayId ? [{ label: 'Unit ID', value: d.unitDisplayId }] : []),
  ];
  const bodyHtml =
    p(`Dear ${esc(d.tenantName)},`) +
    p(
      `Your lease for ${esc(d.unitName)}, ${esc(d.propertyName)} expires in <strong style="color:${urgent ? '#E8A020' : '#facc15'};">${d.daysRemaining} days</strong>.`,
    ) +
    table(rows) +
    p('Please contact your property manager to discuss renewal.');
  const html = shell({
    heading: 'Lease Expiring Soon',
    banner: {
      text: `⚠️ Lease expires in ${d.daysRemaining} days`,
      bg: urgent ? 'rgba(232,160,32,0.1)' : 'rgba(250,204,21,0.1)',
      border: urgent ? 'rgba(232,160,32,0.3)' : 'rgba(250,204,21,0.3)',
      color: urgent ? '#E8A020' : '#facc15',
    },
    bodyHtml,
    accountId: d.accountId,
  });
  const text =
    `Lease Expiring Soon\n\nDear ${d.tenantName},\n\nYour lease for ${d.unitName}, ${d.propertyName} expires in ${d.daysRemaining} days.\n\n` +
    detailsText(rows) +
    `\n\nPlease contact your property manager to discuss renewal.` +
    footerText(d.accountId);
  return { html, text, subject };
}

// ── Template 4: Welcome Owner ────────────────────────────────────────────────

export type WelcomeOwnerData = {
  ownerName: string;
  email: string;
  accountId: string | null;
  temporaryPassword: string;
};

export function welcomeOwnerTemplate(d: WelcomeOwnerData): Rendered {
  const subject = 'Welcome to Domio — Your Account is Ready';
  const loginUrl = `${APP_URL}/login`;
  const rows: Row[] = [
    { label: 'Email', value: d.email },
    ...(d.accountId ? [{ label: 'Account ID', value: d.accountId }] : []),
    { label: 'Temporary Password', value: d.temporaryPassword },
  ];
  const bodyHtml =
    p(`Welcome to Domio, <strong>${esc(d.ownerName)}</strong>!`) +
    p('Your property management account is ready. Here are your login details:') +
    table(rows) +
    p(
      '<strong style="color:#E8A020;">Please log in and change your password immediately.</strong>',
    ) +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;"><tr><td style="border-radius:999px;background:#5B4FE8;">
      <a href="${loginUrl}" style="display:inline-block;padding:11px 22px;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;">Log in to Domio</a>
    </td></tr></table>`;
  const html = shell({
    heading: 'Welcome to Domio',
    bodyHtml,
    accountId: d.accountId,
  });
  const text =
    `Welcome to Domio, ${d.ownerName}!\n\nYour account is ready. Login details:\n\n` +
    detailsText(rows) +
    `\n\nPlease log in and change your password immediately:\n${loginUrl}` +
    footerText(d.accountId);
  return { html, text, subject };
}

// ── Template 5: Utility Bill Overdue ─────────────────────────────────────────

export type UtilityOverdueData = {
  ownerName: string;
  utilityType: string;
  provider: string;
  accountNumber: string;
  propertyName: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  accountId: string | null;
};

export function utilityOverdueTemplate(d: UtilityOverdueData): Rendered {
  const subject = `⚠️ Utility Bill Overdue — ${d.utilityType} — ${d.propertyName}`;
  const rows: Row[] = [
    { label: 'Type', value: d.utilityType },
    { label: 'Provider', value: d.provider },
    { label: 'Account Number', value: d.accountNumber },
    { label: 'Property', value: d.propertyName },
    { label: 'Amount', value: money(d.amount) },
    { label: 'Due Date', value: d.dueDate },
    { label: 'Days Overdue', value: `${d.daysOverdue}` },
  ];
  const bodyHtml =
    p(`Dear ${esc(d.ownerName)},`) +
    p(
      `A utility bill for ${esc(d.propertyName)} is <strong style="color:#ef4444;">overdue</strong>.`,
    ) +
    table(rows) +
    p('Please settle this bill to avoid service disruption.');
  const html = shell({
    heading: 'Utility Bill Overdue',
    banner: {
      text: `⚠️ ${d.daysOverdue} days overdue · ${money(d.amount)} due`,
      bg: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.3)',
      color: '#ef4444',
    },
    bodyHtml,
    accountId: d.accountId,
  });
  const text =
    `Utility Bill Overdue\n\nDear ${d.ownerName},\n\nA utility bill for ${d.propertyName} is overdue.\n\n` +
    detailsText(rows) +
    `\n\nPlease settle this bill to avoid service disruption.` +
    footerText(d.accountId);
  return { html, text, subject };
}
