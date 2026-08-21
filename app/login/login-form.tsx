'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authenticate } from './actions';

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-zinc-500';
const submitClass =
  'mt-2 rounded-lg border border-zinc-300 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-60';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  const [forgotPending, setForgotPending] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  async function submitForgot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForgotPending(true);
    setForgotMessage(null);
    const email = new FormData(event.currentTarget).get('email');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* generic regardless */
    } finally {
      setForgotMessage('Check your email for a reset link.');
      setForgotPending(false);
    }
  }

  const header = (
    <div className="mb-6 flex flex-col gap-1.5">
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        {mode === 'forgot' ? 'Forgot password' : 'Sign in'}
      </h1>
      <p className="text-sm text-[#E8E8F2]">
        {mode === 'forgot'
          ? "Enter your email and we'll send you a reset link."
          : 'Enter your email and password to continue.'}
      </p>
    </div>
  );

  if (mode === 'forgot') {
    return (
      <form
        onSubmit={submitForgot}
        className="flex flex-col gap-4"
        data-testid="forgot-form"
      >
        {header}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="forgot-email" className={labelClass}>
            Email
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        {forgotMessage && (
          <p
            role="status"
            data-testid="forgot-message"
            className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
          >
            {forgotMessage}
          </p>
        )}

        <button type="submit" disabled={forgotPending} className={submitClass}>
          {forgotPending ? 'Sending…' : 'Send Reset Link'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setForgotMessage(null);
          }}
          className="self-start text-xs font-medium text-zinc-500 transition-colors hover:text-white"
        >
          ← Back to login
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {header}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={1}
          placeholder="••••••••"
          className={inputClass}
        />
        <button
          type="button"
          data-testid="forgot-password-link"
          onClick={() => setMode('forgot')}
          className="mt-1 self-end text-xs font-medium text-zinc-500 transition-colors hover:text-white"
        >
          Forgot password?
        </button>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
        >
          {errorMessage}
        </p>
      )}

      {justRegistered && (
        <p
          role="status"
          className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
        >
          Account created! You can now sign in.
        </p>
      )}

      <button type="submit" disabled={isPending} className={submitClass}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-xs text-[#B0B0C8]">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-medium text-zinc-500 transition-colors hover:text-white"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
