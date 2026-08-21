'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NotificationConfigData } from '@/lib/notification-config';

const glassCard =
  'rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] p-5 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]';
const sectionLabel =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500';
const inputClass =
  'w-20 rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-sm text-white outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1.5 text-left"
    >
      <span className="text-sm text-[#E8E8F2]">{label}</span>
      <span
        className={
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ' +
          (checked ? 'bg-zinc-900' : 'bg-[#312D58]')
        }
      >
        <span
          className={
            'inline-block h-5 w-5 transform rounded-full bg-white transition-transform ' +
            (checked ? 'translate-x-5' : 'translate-x-0.5')
          }
        />
      </span>
    </button>
  );
}

export default function NotificationSettings({
  initial,
}: {
  initial: NotificationConfigData;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [daysText, setDaysText] = useState(initial.leaseExpiryDays.join(', '));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof NotificationConfigData>(
    key: K,
    value: NotificationConfigData[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function saveAll() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const leaseExpiryDays = daysText
      .split(',')
      .map((s) => Math.round(Number(s.trim())))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 365);

    const res = await fetch('/api/notification-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, leaseExpiryDays }),
    });
    if (res.ok) {
      setSaved(true);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to save. Please try again.');
    }
    setSaving(false);
  }

  const disabled = !form.emailEnabled;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Notification Settings
        </h1>
        <Link
          href="/dashboard/settings/email-history"
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-white"
        >
          View Email History →
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {/* Email channel */}
        <div className={glassCard}>
          <p className={sectionLabel}>Email Channel</p>
          <div className="mt-2">
            <Toggle
              checked={form.emailEnabled}
              onChange={(v) => set('emailEnabled', v)}
              label="Enable email notifications"
            />
            <p className="mt-1 text-xs text-[#6A6A8A]">
              Master switch — when off, no emails are sent regardless of the
              settings below.
            </p>
          </div>
        </div>

        {/* Rent reminders */}
        <div className={glassCard + (disabled ? ' opacity-60' : '')}>
          <p className={sectionLabel}>Rent Reminders</p>
          <div className="mt-2">
            <Toggle
              checked={form.rentReminderEnabled}
              onChange={(v) => set('rentReminderEnabled', v)}
              label="Send overdue rent reminders"
            />
            <div className="mt-2 flex items-center gap-2 text-sm text-[#E8E8F2]">
              <span>Send reminder every</span>
              <input
                type="number"
                min={1}
                max={365}
                value={form.rentReminderIntervalDays}
                onChange={(e) =>
                  set('rentReminderIntervalDays', Number(e.target.value))
                }
                className={inputClass}
              />
              <span>days</span>
            </div>
          </div>
        </div>

        {/* Lease expiry */}
        <div className={glassCard + (disabled ? ' opacity-60' : '')}>
          <p className={sectionLabel}>Lease Expiry Warnings</p>
          <div className="mt-2">
            <Toggle
              checked={form.leaseExpiryEnabled}
              onChange={(v) => set('leaseExpiryEnabled', v)}
              label="Send lease expiry warnings"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#E8E8F2]">
              <span>Warn at</span>
              <input
                value={daysText}
                onChange={(e) => {
                  setDaysText(e.target.value);
                  setSaved(false);
                }}
                placeholder="60, 30, 14"
                className="w-40 rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-sm text-white outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20"
              />
              <span>days before expiry</span>
            </div>
          </div>
        </div>

        {/* Payment confirmations */}
        <div className={glassCard + (disabled ? ' opacity-60' : '')}>
          <p className={sectionLabel}>Payment Confirmations</p>
          <div className="mt-2">
            <Toggle
              checked={form.paymentConfirmEnabled}
              onChange={(v) => set('paymentConfirmEnabled', v)}
              label="Send payment received confirmation to tenant"
            />
          </div>
        </div>

        {/* Utility reminders */}
        <div className={glassCard + (disabled ? ' opacity-60' : '')}>
          <p className={sectionLabel}>Utility Bill Reminders</p>
          <div className="mt-2">
            <Toggle
              checked={form.utilityReminderEnabled}
              onChange={(v) => set('utilityReminderEnabled', v)}
              label="Send overdue utility bill alerts"
            />
          </div>
        </div>

        {/* Welcome */}
        <div className={glassCard + (disabled ? ' opacity-60' : '')}>
          <p className={sectionLabel}>Welcome Emails</p>
          <div className="mt-2">
            <Toggle
              checked={form.welcomeEmailEnabled}
              onChange={(v) => set('welcomeEmailEnabled', v)}
              label="Send welcome email to new owners"
            />
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
        {saved && <span className="text-sm text-emerald-400">✓ Saved</span>}
      </div>
    </div>
  );
}
