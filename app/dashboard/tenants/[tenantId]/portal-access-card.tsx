'use client';

import { useState } from 'react';

export default function PortalAccessCard({
  tenantId,
  phone,
  initialEnabled,
}: {
  tenantId: string;
  phone: string;
  initialEnabled: boolean;
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
    <div className="rounded-2xl border border-[#312D58] bg-[#17152F] p-6 text-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#8B6FE8] font-semibold mb-0.5">
            Tenant Portal Access
          </p>
          <p className="text-[#B0B0C8] text-xs">
            Allow this tenant to log in at{' '}
            <span className="font-mono text-[#8B6FE8]">/tenant-portal/login</span>{' '}
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
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#5B4FE8]/50 disabled:opacity-50 ${
            enabled ? 'bg-[#5B4FE8]' : 'bg-[#312D58]'
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
              : 'border-[#312D58] bg-[rgba(255,255,255,0.04)] text-[#6A6A8A]'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-[#4A4A6A]'}`} />
          {enabled ? 'Portal Active' : 'Portal Disabled'}
        </span>
        {enabled && (
          <span className="text-xs text-[#6A6A8A]">Phone: {phone}</span>
        )}
      </div>

      {/* Generate OTP button — only when enabled */}
      {enabled && (
        <div className="flex flex-col gap-3">
          <button
            id="generate-otp-btn"
            type="button"
            onClick={generateOtp}
            disabled={otpPending}
            className="rounded-lg border border-[#5B4FE8]/40 bg-[#5B4FE8]/10 px-4 py-2 text-sm font-medium text-[#8B6FE8] transition-colors hover:bg-[#5B4FE8]/20 disabled:opacity-50"
          >
            {otpPending ? 'Generating…' : '📲 Generate OTP for Tenant'}
          </button>

          {/* Dev OTP display */}
          {devOtp && !smsSent && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                OTP (Relay to Tenant)
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-amber-300">
                {devOtp}
              </p>
              <p className="mt-0.5 text-xs text-amber-500/70">
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
