'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const inputClass =
  'w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-white focus:bg-white/[0.1] focus:ring-1 focus:ring-white/30';
const labelClass = 'text-xs font-bold text-zinc-300 uppercase tracking-wider';
const submitClass =
  'w-full rounded-xl bg-white px-5 py-3 text-sm font-bold text-zinc-950 shadow-md transition-all hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed';

export default function TenantRegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/tenant-portal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          password,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? 'Registration failed. Please try again.');
        setPending(false);
        return;
      }

      router.push('/tenant-portal');
      router.refresh();
    } catch (err: unknown) {
      console.error('Fetch error:', err);
      setError('Connection error. Please check your connection and try again.');
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-6">
      <div className="w-full max-w-md">
        {/* Glassmorphic Card (Matching Homepage) */}
        <div className="rounded-3xl border border-white/20 bg-black/40 p-7 sm:p-9 shadow-2xl backdrop-blur-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/40 bg-blue-950/60 text-2xl shadow-inner mb-3 text-blue-300">
              👤
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Tenant Registration
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Create your tenant handle so your landlord can assign leases
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-username" className={labelClass}>
                Unique Username Handle
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 font-mono text-zinc-500 text-sm">@</span>
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="john_doe"
                  className={inputClass + ' pl-9 font-mono'}
                  autoComplete="username"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Landlords will search and assign lease units with this @username.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-name" className={labelClass}>
                Full Name
              </label>
              <input
                id="reg-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className={inputClass}
                autoComplete="name"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-phone" className={labelClass}>
                  Phone Number
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                  autoComplete="tel"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-email" className={labelClass}>
                  Email <span className="text-zinc-500">(optional)</span>
                </label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className={inputClass}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password" className={labelClass}>
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs font-semibold text-red-300">
                {error}
              </p>
            )}

            <button type="submit" disabled={pending} className={submitClass + ' mt-2'}>
              {pending ? 'Registering Account…' : 'Create Tenant Account →'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-4 text-center">
            <p className="text-xs text-zinc-400">
              Already have an account?{' '}
              <Link href="/tenant-portal/login" className="font-bold text-white hover:underline">
                Sign In Here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
