'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticateWithGoogle } from '@/app/login/actions';

const inputClass =
  'w-full rounded-xl border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-[#8E8EA8] focus:border-[#E8A020] focus:ring-2 focus:ring-[#E8A020]/20';
const labelClass = 'text-xs font-semibold uppercase tracking-wider text-zinc-400';
const submitClass =
  'mt-3 w-full rounded-xl bg-gradient-to-r from-[#E8A020] to-[#FFC453] px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-[#E8A020]/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed';

type RoleOption = 'OWNER' | 'RENTER' | 'BOTH';

export default function RegisterForm() {
  const router = useRouter();
  const [role, setRole] = useState<RoleOption>('OWNER');
  const [location, setLocation] = useState('');
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);

  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-detect location handler
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLocation(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Attempt reverse geocoding via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            { headers: { 'User-Agent': 'Domio-App' } }
          );
          if (res.ok) {
            const data = await res.json();
            const formatted =
              data.address?.city ||
              data.address?.town ||
              data.address?.state ||
              data.display_name?.split(',').slice(0, 3).join(',') ||
              `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            setLocation(formatted);
            setLocationSuccess(true);
          } else {
            setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            setLocationSuccess(true);
          }
        } catch {
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setLocationSuccess(true);
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        setDetectingLocation(false);
        setErrorMessage(
          err.code === 1
            ? 'Location access denied. Please type your location manually.'
            : 'Unable to retrieve location. Please type manually.'
        );
      },
      { timeout: 10000 }
    );
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = new FormData(event.currentTarget);
    const name = form.get('name') as string;
    const email = form.get('email') as string;
    const phone = form.get('phone') as string;
    const loc = form.get('location') as string;
    const password = form.get('password') as string;
    const confirmPassword = form.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsPending(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          location: loc || location,
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? 'Registration failed. Please try again.');
        return;
      }

      setSuccessMessage('Account created successfully! Redirecting to sign in…');
      setTimeout(() => router.push('/login?registered=1'), 1200);
    } catch {
      setErrorMessage('Something went wrong. Please check your connection.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" data-testid="register-form">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Create Account</h1>
        <p className="text-xs text-zinc-400">
          Sign up to manage properties, units, or track your tenancy
        </p>
      </div>

      {/* Role Selection */}
      <div className="flex flex-col gap-2">
        <label className={labelClass}>I am registering as</label>
        <div className="grid grid-cols-3 gap-2">
          {/* Owner */}
          <button
            type="button"
            onClick={() => setRole('OWNER')}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-all ${
              role === 'OWNER'
                ? 'border-[#E8A020] bg-[#E8A020]/15 text-white shadow-md'
                : 'border-[#312D58] bg-white/[0.03] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            <span className="text-xl">🏢</span>
            <span className="text-xs font-bold leading-none">Owner</span>
            <span className="text-[10px] text-zinc-400">Landlord</span>
          </button>

          {/* Renter */}
          <button
            type="button"
            onClick={() => setRole('RENTER')}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-all ${
              role === 'RENTER'
                ? 'border-[#E8A020] bg-[#E8A020]/15 text-white shadow-md'
                : 'border-[#312D58] bg-white/[0.03] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs font-bold leading-none">Renter</span>
            <span className="text-[10px] text-zinc-400">Tenant</span>
          </button>

          {/* Both */}
          <button
            type="button"
            onClick={() => setRole('BOTH')}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2.5 text-center transition-all ${
              role === 'BOTH'
                ? 'border-[#E8A020] bg-[#E8A020]/15 text-white shadow-md'
                : 'border-[#312D58] bg-white/[0.03] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
            }`}
          >
            <span className="text-xl">🔄</span>
            <span className="text-xs font-bold leading-none">Both</span>
            <span className="text-[10px] text-zinc-400">Owner & Renter</span>
          </button>
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          placeholder="e.g. John Doe"
          className={inputClass}
        />
      </div>

      {/* Email / Gmail */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-email" className={labelClass}>
          Email (Gmail)
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="e.g. yourname@gmail.com"
          className={inputClass}
        />
      </div>

      {/* Phone Number */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className={labelClass}>
          Phone Number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder="e.g. +1 555-0199 or 9876543210"
          className={inputClass}
        />
      </div>

      {/* Location (Manual or Automatic) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="location" className={labelClass}>
            Location / City
          </label>
          <button
            type="button"
            onClick={handleAutoDetectLocation}
            disabled={detectingLocation}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E8A020] transition-colors hover:text-amber-300 disabled:opacity-50"
          >
            <span>{detectingLocation ? '⏳ Detecting...' : '📍 Auto-Detect GPS'}</span>
          </button>
        </div>
        <div className="relative">
          <input
            id="location"
            name="location"
            type="text"
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setLocationSuccess(false);
            }}
            placeholder="Type city/address or click Auto-Detect"
            className={`${inputClass} pr-8`}
          />
          {locationSuccess && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400">
              ✓
            </span>
          )}
        </div>
      </div>

      {/* Password & Confirm Password in 2 columns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            minLength={6}
            placeholder="Min 6 chars"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirmPassword" className={labelClass}>
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Repeat password"
            className={inputClass}
          />
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400 font-medium"
        >
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-400 font-medium"
        >
          {successMessage}
        </p>
      )}

      {/* Submit Button */}
      <button type="submit" disabled={isPending || detectingLocation} className={submitClass}>
        {isPending ? 'Creating Account…' : `Register as ${role === 'BOTH' ? 'Owner & Renter' : role === 'RENTER' ? 'Renter' : 'Owner'}`}
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
        <span>Sign up with Google</span>
      </button>

      {/* Back to Login Link */}
      <p className="text-center text-xs text-zinc-400">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-bold text-[#E8A020] transition-colors hover:text-amber-300 underline underline-offset-2"
        >
          Sign in here
        </Link>
      </p>
    </form>
  );
}
