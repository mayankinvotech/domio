'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const inputClass =
  'w-full rounded-xl border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-3 text-base text-white outline-none transition placeholder:text-[#4A4A6A] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#B0B0C8]';
const submitClass =
  'w-full rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(91,79,232,0.35)] transition-opacity hover:opacity-90 disabled:opacity-50';

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
    <div className="flex min-h-[80vh] items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[#1E1C3A] bg-[#13112A] p-8 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.9)]">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-700 text-3xl shadow-md">
              👤
            </div>
          </div>

          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white">Tenant Self-Registration</h1>
            <p className="mt-1 text-sm text-[#B0B0C8]">
              Create your tenant account with a unique username handle so your landlord can easily add you.
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-username" className={labelClass}>
                Unique Username Handle
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 font-mono text-zinc-500">@</span>
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
              <p className="text-xs text-[#6A6A8A]">
                Your unique handle that landlords will use to add you.
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

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  Email <span className="text-[#6A6A8A]">(optional)</span>
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
              <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <button type="submit" disabled={pending} className={submitClass + ' mt-2'}>
              {pending ? 'Registering Account…' : 'Register Tenant Account →'}
            </button>
          </form>

          <div className="mt-6 border-t border-[#312D58] pt-4 text-center">
            <p className="text-xs text-[#B0B0C8]">
              Already have an account?{' '}
              <Link href="/tenant-portal/login" className="font-semibold text-zinc-500 hover:underline">
                Sign In Here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
