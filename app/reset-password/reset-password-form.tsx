'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const inputClass =
  'w-full rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-zinc-500';

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // No token in the URL at all → can't reset.
  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <p
          role="alert"
          data-testid="reset-error"
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          Invalid or expired reset link.
        </p>
        <Link
          href="/login"
          data-testid="request-new-reset"
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-white"
        >
          Request a new reset link →
        </Link>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (next.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setPending(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: next }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(data?.error ?? 'Could not reset password. Please try again.');
      }
    } catch {
      setError('Could not reset password. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p
        role="status"
        data-testid="reset-success"
        className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
      >
        Password reset! Redirecting to login…
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="newPassword" className={labelClass}>
          New Password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      {error && (
        <div className="flex flex-col gap-2">
          <p
            role="alert"
            data-testid="reset-error"
            className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
          >
            {error}
          </p>
          {/expired|invalid/i.test(error) && (
            <Link
              href="/login"
              data-testid="request-new-reset"
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-white"
            >
              Request a new reset link →
            </Link>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg border border-zinc-300 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? 'Resetting…' : 'Reset Password'}
      </button>
    </form>
  );
}
