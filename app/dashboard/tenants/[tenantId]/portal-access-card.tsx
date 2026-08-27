'use client';

import { useState } from 'react';

function buildWhatsAppUrl({
  phone,
  tenantName,
  monthlyRent,
  propertyName,
  unitName,
}: {
  phone: string;
  tenantName: string;
  monthlyRent: number;
  propertyName: string;
  unitName: string;
}) {
  const digits = phone.replace(/\D/g, '');
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const dueDate = nextMonth.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const amount = monthlyRent.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  const msg = [
    `Hello ${tenantName} 👋`,
    ``,
    `This is a friendly reminder that your monthly rent for *${propertyName} – ${unitName}* is due on *${dueDate}*.`,
    ``,
    `💰 Amount Due: *${amount}*`,
    ``,
    `Please ensure timely payment to avoid late charges. You can view your ledger and payment details at:`,
    `https://domio.app/tenant-portal`,
    ``,
    `Thank you! 🙏`,
    `– Domio Property Management`,
  ].join('\n');

  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export default function PortalAccessCard({
  tenantId,
  phone,
  initialEnabled,
  tenantName,
  monthlyRent,
  propertyName,
  unitName,
}: {
  tenantId: string;
  phone: string;
  initialEnabled: boolean;
  tenantName: string;
  monthlyRent: number;
  propertyName: string;
  unitName: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [otpPending, setOtpPending] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function togglePortal() {
    setError(null);
    setSuccessMsg(null);
    setPending(true);
    const next = !enabled;

    const res = await fetch(`/api/tenants/${tenantId}/portal`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portalEnabled: next }),
    });
    const data = await res.json().catch(() => null);

    if (res.ok) {
      setEnabled(next);
      setSuccessMsg(
        next
          ? data?.smsSent
            ? '✓ Portal enabled — welcome SMS sent to tenant.'
            : '✓ Portal enabled — no SMS sent (Twilio not configured).'
          : '✓ Portal access disabled.',
      );
    } else {
      setError(data?.error ?? 'Failed to update portal access.');
    }
    setPending(false);
  }

  async function generateOtp() {
    setError(null);
    setSuccessMsg(null);
    setDevOtp(null);
    setSmsSent(false);
    setOtpPending(true);

    const res = await fetch('/api/tenant-portal/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => null);

    if (res.ok) {
      setSmsSent(data?.smsSent ?? false);
      setDevOtp(data?.devOtp ?? null);
      setSuccessMsg(
        data?.smsSent
          ? `✓ OTP sent to ${phone} via SMS.`
          : `✓ OTP generated — relay to tenant (see code below).`,
      );
    } else {
      setError(data?.error ?? 'Failed to generate OTP.');
    }
    setOtpPending(false);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400 font-semibold mb-0.5">
            Tenant Portal Access
          </p>
          <p className="text-zinc-400 text-xs">
            Allow this tenant to log in at{' '}
            <span className="font-mono text-zinc-300">/tenant-portal/login</span>{' '}
            using their phone number + OTP.
          </p>
        </div>

        {/* Toggle switch */}
        <button
          id="portal-toggle"
          type="button"
          onClick={togglePortal}
          disabled={pending}
          aria-pressed={enabled}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500/50 disabled:opacity-50 ${
            enabled ? 'bg-zinc-800' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 translate-x-1 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : ''
            }`}
          />
        </button>
      </div>

      {/* Status badge */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
            enabled
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-white/10 bg-white/[0.03] text-zinc-500'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
          {enabled ? 'Portal Active' : 'Portal Disabled'}
        </span>
        {enabled && (
          <span className="text-xs text-zinc-500">Phone: {phone}</span>
        )}
      </div>

      {/* Generate OTP button & WhatsApp reminder — only when enabled */}
      {enabled && (
        <div className="flex flex-col gap-3">
          <button
            id="generate-otp-btn"
            type="button"
            onClick={generateOtp}
            disabled={otpPending}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {otpPending ? 'Generating…' : '📲 Generate OTP for Tenant'}
          </button>

          {/* WhatsApp Rent Reminder button */}
          {phone && monthlyRent > 0 && (
            <a
              href={buildWhatsAppUrl({ phone, tenantName, monthlyRent, propertyName, unitName })}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 hover:border-emerald-400/60"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.528 5.847L.057 23.5l5.805-1.523A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.028-1.382l-.36-.214-3.744.981.999-3.648-.234-.374A9.787 9.787 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
              </svg>
              Send WhatsApp Rent Reminder
            </a>
          )}

          {/* Dev OTP display */}
          {devOtp && !smsSent && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                OTP (Relay to Tenant)
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-white">
                {devOtp}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Share this with the tenant via WhatsApp or call. Expires in 10 minutes.
              </p>
            </div>
          )}
          {smsSent && (
            <p className="text-xs text-emerald-400">📱 OTP sent via SMS to {phone}</p>
          )}
        </div>
      )}

      {successMsg && (
        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {successMsg}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
