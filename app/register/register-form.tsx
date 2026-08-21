'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-zinc-500';
const submitClass =
  'mt-2 rounded-lg border border-zinc-300 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-60';

export default function RegisterForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = new FormData(event.currentTarget);
    const name = form.get('name') as string;
    const email = form.get('email') as string;
    const password = form.get('password') as string;
    const confirmPassword = form.get('confirmPassword') as string;

    // Client-side password match check
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? 'Registration failed. Please try again.');
        return;
      }

      setSuccessMessage('Account created! Redirecting to sign in…');
      setTimeout(() => router.push('/login?registered=1'), 1500);
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="register-form">
      {/* Header */}
      <div className="mb-2 flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Create account</h1>
        <p className="text-sm text-[#E8E8F2]">
          Fill in your details to get started with Domio.
        </p>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          Full name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          placeholder="John Smith"
          className={inputClass}
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-email" className={labelClass}>
          Email
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-password" className={labelClass}>
          Password
        </label>
        <input
          id="reg-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className={inputClass}
        />
      </div>

      {/* Confirm Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="Repeat your password"
          className={inputClass}
        />
      </div>

      {/* Error message */}
      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          {errorMessage}
        </p>
      )}

      {/* Success message */}
      {successMessage && (
        <p
          role="status"
          className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
        >
          {successMessage}
        </p>
      )}

      {/* Submit */}
      <button type="submit" disabled={isPending} className={submitClass}>
        {isPending ? 'Creating account…' : 'Create account'}
      </button>

      {/* Back to login */}
      <p className="text-center text-xs text-[#B0B0C8]">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-zinc-500 transition-colors hover:text-white"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
