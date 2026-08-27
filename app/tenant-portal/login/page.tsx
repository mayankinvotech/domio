'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Exact card/input styles from homepage action cards
const cardClass = 'rounded-xl border border-white/25 bg-black/40 backdrop-blur-md';
const inputClass = 'w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-white/50 focus:bg-black/50';
const labelClass = 'text-[11px] font-bold uppercase tracking-widest text-zinc-400';
// White pill — exact "Sign Up Free →" style from homepage
const primaryBtn = 'w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

type LoginMode = 'phone' | 'password';
type Step = 'phone' | 'otp';

export default function TenantLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault(); setError(null); setPending(true);
    try {
      const res = await fetch('/api/tenant-portal/login-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Invalid email or password.'); setPending(false); return; }
      router.push('/tenant-portal'); router.refresh();
    } catch { setError('Network error.'); setPending(false); }
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault(); setError(null); setPending(true); setDevOtp(null);
    try {
      const res = await fetch('/api/tenant-portal/request-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Could not send OTP.'); return; }
      setTenantId(data.tenantId ?? ''); setSmsSent(data.smsSent ?? false);
      setWhatsappUrl(data.whatsappUrl ?? null);
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep('otp');
    } catch { setError('Network error.');
    } finally { setPending(false); }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault(); setError(null); setPending(true);
    try {
      const res = await fetch('/api/tenant-portal/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Invalid OTP.'); setPending(false); return; }
      router.push('/tenant-portal'); router.refresh();
    } catch { setError('Network error.'); setPending(false); }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-6">
      <div className="w-full max-w-md">

        {/* Page heading — same style as homepage hero */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Tenant Sign In</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Access your rent ledger, lease agreements &amp; payment receipts
          </p>
        </div>

        {/* Card — exact homepage action card style */}
        <div className={cardClass + ' p-7 sm:p-8 shadow-2xl'}>

          {/* Mode tabs — white active pill, grey inactive */}
          <div className="mb-6 flex rounded-xl border border-white/15 bg-white/[0.04] p-1">
            {(['phone', 'password'] as const).map((m) => (
              <button key={m} type="button"
                onClick={() => { setMode(m); setError(null); if (m === 'phone') setStep('phone'); }}
                className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  mode === m ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}>
                {m === 'phone' ? '📲 Phone OTP' : '🔑 Email & Password'}
              </button>
            ))}
          </div>

          {/* Password form */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tp-email" className={labelClass}>Email Address</label>
                <input id="tp-email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                  className={inputClass} autoComplete="email" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tp-pass" className={labelClass}>Password</label>
                <input id="tp-pass" type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className={inputClass} autoComplete="current-password" />
              </div>
              {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs font-semibold text-red-300">{error}</p>}
              <button type="submit" disabled={pending} className={primaryBtn + ' mt-1'}>
                {pending ? 'Signing In…' : 'Sign In to Portal →'}
              </button>
            </form>
          )}

          {/* Phone step */}
          {mode === 'phone' && step === 'phone' && (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tp-phone" className={labelClass}>Your Phone Number</label>
                <input id="tp-phone" type="tel" required value={phone}
                  onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210"
                  className={inputClass} autoComplete="tel" />
                <p className="text-[11px] text-zinc-500 mt-0.5">We'll send a 6-digit OTP via SMS and WhatsApp.</p>
              </div>
              {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs font-semibold text-red-300">{error}</p>}
              <button type="submit" disabled={pending} className={primaryBtn + ' mt-1'}>
                {pending ? 'Sending OTP…' : 'Send OTP via SMS / WhatsApp →'}
              </button>
            </form>
          )}

          {/* OTP step */}
          {mode === 'phone' && step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="rounded-xl border border-white/15 bg-white/[0.04] p-3.5 text-center">
                <p className="text-xs font-semibold text-white">
                  📲 OTP sent to <span className="font-mono text-zinc-300">{phone}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  {smsSent ? 'Check your SMS inbox.' : 'Check your phone or use WhatsApp below.'}
                </p>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-bold text-white hover:bg-white/10 transition-colors">
                    💬 Open on WhatsApp
                  </a>
                )}
              </div>
              {devOtp && (
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-[11px] text-zinc-500">OTP received?</span>
                  <button type="button" onClick={() => setOtp(devOtp)}
                    className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20 transition cursor-pointer">
                    ⚡ Auto-Fill ({devOtp})
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="tp-otp" className={labelClass}>Enter 6-Digit OTP</label>
                <input id="tp-otp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className={inputClass + ' text-center text-2xl tracking-[0.5em] font-mono'}
                  autoComplete="one-time-code" autoFocus />
              </div>
              {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-2.5 text-xs font-semibold text-red-300">{error}</p>}
              <button type="submit" disabled={pending || otp.length !== 6} className={primaryBtn + ' mt-1'}>
                {pending ? 'Verifying…' : 'Verify & Enter Portal →'}
              </button>
              <button type="button"
                onClick={() => { setStep('phone'); setOtp(''); setError(null); setDevOtp(null); }}
                className="text-center text-xs text-zinc-500 hover:text-white transition-colors cursor-pointer">
                ← Use a different phone number
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-white/10 pt-5 text-center">
            <p className="text-xs text-zinc-500">
              New tenant?{' '}
              <Link href="/tenant-portal/register" className="font-bold text-white hover:underline">
                Create your account →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
