'use client';

import { useState } from 'react';

const inputClass =
  'w-full rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 pr-10 text-sm text-white outline-none transition placeholder:text-[#6A6A8A] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4M6.6 6.6A17.7 17.7 0 0 0 2 11s3.5 7 10 7a10.7 10.7 0 0 0 4.4-.9" />
          <path d="M3 3l18 18" />
        </>
      )}
    </svg>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6A6A8A] transition-colors hover:text-zinc-500"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validation.
    if (!current || !next || !confirm) {
      setError('All fields are required.');
      return;
    }
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
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setSuccess('Password updated successfully.');
        setCurrent('');
        setNext('');
        setConfirm('');
      } else {
        setError(data?.error ?? 'Could not update password. Please try again.');
      }
    } catch {
      setError('Could not update password. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        Password
      </h2>
      <p className="mt-1 text-sm text-[#6A6A8A]">
        Update the password you use to sign in to Domio.
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex max-w-sm flex-col gap-4">
        <PasswordField id="currentPassword" label="Current Password" value={current} onChange={setCurrent} />
        <PasswordField id="newPassword" label="New Password" value={next} onChange={setNext} />
        <PasswordField id="confirmPassword" label="Confirm New Password" value={confirm} onChange={setConfirm} />

        {error && (
          <p role="alert" data-testid="password-error" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
        {success && (
          <p role="status" data-testid="password-success" className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </section>
  );
}
