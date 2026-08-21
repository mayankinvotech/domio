'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const inputClass =
  'w-full rounded-xl border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-3 text-base text-white outline-none transition placeholder:text-[#4A4A6A] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#B0B0C8]';
const submitClass =
  'w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(91,79,232,0.35)] transition-opacity hover:opacity-90 disabled:opacity-50';

type LoginMode = 'password' | 'phone';
type Step = 'phone' | 'otp';

export default function TenantLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('password');

  // Password mode states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Phone OTP mode states
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Password login ─────────────────────────────────────────────────────────
  async function handlePasswordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/tenant-portal/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Invalid username or password.');
        setPending(false);
        return;
      }

      router.push('/tenant-portal');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setPending(false);
    }
  }

  // ── Step 1: request OTP ────────────────────────────────────────────────────
  async function handleRequestOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    setDevOtp(null);

    try {
      const res = await fetch('/api/tenant-portal/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setTenantId(data.tenantId ?? '');
      setSmsSent(data.smsSent ?? false);
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setPending(false);
    }
  }

  // ── Step 2: verify OTP ─────────────────────────────────────────────────────
  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/tenant-portal/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, otp: otp.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Invalid OTP. Please try again.');
        setPending(false);
        return;
      }

      router.push('/tenant-portal');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-[#1E1C3A] bg-[#13112A] p-8 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)]">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-3xl shadow-md">
              🔐
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mb-6 flex rounded-xl border border-[#312D58] bg-[#0E0C22] p-1">
            <button
              type="button"
              onClick={() => { setMode('password'); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === 'password'
                  ? 'bg-zinc-900 text-white shadow-md'
                  : 'text-[#B0B0C8] hover:text-white'
              }`}
            >
              Username &amp; Password
            </button>
            <button
              type="button"
              onClick={() => { setMode('phone'); setError(null); setStep('phone'); }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === 'phone'
                  ? 'bg-zinc-900 text-white shadow-md'
                  : 'text-[#B0B0C8] hover:text-white'
              }`}
            >
              Phone OTP
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
              <div className="text-center">
                <h1 className="text-xl font-semibold text-white">Sign In to Tenant Portal</h1>
                <p className="mt-1 text-xs text-[#B0B0C8]">
                  Enter your unique tenant username handle and password.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="portal-username" className={labelClass}>
                  Username Handle
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 font-mono text-zinc-500">@</span>
                  <input
                    id="portal-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="john_doe"
                    className={inputClass + ' pl-9 font-mono'}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="portal-pass" className={labelClass}>
                  Password
                </label>
                <input
                  id="portal-pass"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputClass}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button type="submit" disabled={pending} className={submitClass + ' mt-1'}>
                {pending ? 'Signing In…' : 'Sign In →'}
              </button>
            </form>
          ) : step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">
              <div className="text-center">
                <h1 className="text-xl font-semibold text-white">OTP Access</h1>
                <p className="mt-1 text-sm text-[#B0B0C8]">
                  Enter the phone number registered by your landlord to receive an OTP.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="portal-phone" className={labelClass}>
                  Phone Number
                </label>
                <input
                  id="portal-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                  autoComplete="tel"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button type="submit" disabled={pending} className={submitClass}>
                {pending ? 'Sending OTP…' : 'Send OTP →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <div className="text-center">
                <h1 className="text-xl font-semibold text-white">Enter OTP</h1>
                <p className="mt-1 text-sm text-[#B0B0C8]">
                  {smsSent
                    ? `A 6-digit OTP was sent to ${phone}.`
                    : `Your landlord has your OTP. Enter code below.`}
                </p>
              </div>

              {devOtp && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">
                    Dev Mode OTP
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-amber-300">
                    {devOtp}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="portal-otp" className={labelClass}>
                  6-Digit OTP
                </label>
                <input
                  id="portal-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className={inputClass + ' text-center text-2xl tracking-[0.5em]'}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button type="submit" disabled={pending || otp.length !== 6} className={submitClass}>
                {pending ? 'Verifying…' : 'Verify & Sign In →'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(null); setDevOtp(null); }}
                className="text-center text-xs text-zinc-500 transition-colors hover:text-white"
              >
                ← Use a different number
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-[#312D58] pt-4 text-center">
            <p className="text-xs text-[#B0B0C8]">
              New tenant without an account?{' '}
              <Link href="/tenant-portal/register" className="font-semibold text-zinc-500 hover:underline">
                Self-Register Here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
