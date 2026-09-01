'use client';

import { useActionState, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authenticate, authenticateWithGoogle } from './actions';

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
          Email or Phone Number
        </label>
        <input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          required
          placeholder="e.g. you@example.com or +1 555-0199"
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

      <button type="submit" disabled={isPending} className="mt-2 rounded-xl bg-gradient-to-r from-[#E8A020] to-[#FFC453] px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-[#E8A020]/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 cursor-pointer">
        {isPending ? 'Signing in…' : 'Sign In to Domio'}
      </button>

      {/* Social Divider */}
      <div className="relative my-2 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#312D58]" />
        </div>
        <div className="relative bg-[#17152F] px-3 text-[11px] font-semibold uppercase tracking-wider text-[#8E8EA8]">
          Or continue with
        </div>
      </div>

      {/* Google Login Button */}
      <button
        type="button"
        onClick={() => authenticateWithGoogle()}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-100 active:scale-[0.99] cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      <div className="mt-2 border-t border-[#312D58]/60 pt-4 text-center">
        <p className="text-xs text-[#B0B0C8]">
          Don&apos;t have an account yet?
        </p>
        <Link
          href="/register"
          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E8A020]/40 bg-[#E8A020]/10 px-4 py-2.5 text-xs font-bold text-[#E8A020] transition-all hover:bg-[#E8A020]/20 hover:border-[#E8A020]"
        >
          <span>✨</span> Create New Account (Owner / Renter)
        </Link>
      </div>
    </form>
  );
}
