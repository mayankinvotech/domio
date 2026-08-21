import { Suspense } from 'react';
import LoginForm from './login-form';

export default function LoginPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#0A0A0F] px-4 py-16">
      {/* Purple radial glow — top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -top-40 h-[500px] w-[500px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(0,0,0,0.06) 0%, transparent 65%)',
        }}
      />
      {/* Gold warm glow — bottom-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(232,160,32,0.10) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Gold wordmark */}
        <div className="mb-6 text-center">
          <span className="text-2xl font-black tracking-[0.25em] text-[#E8A020]">
            DOMIO
          </span>
        </div>

        <div className="rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-xl">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white/5" />}>
            <LoginForm />
          </Suspense>
        </div>

        {/* Tenant Portal Registration & Login Options */}
        <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F]/70 p-4 text-center shadow-lg backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Tenant Account Access
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-2">
            <a
              href="/tenant-portal/register"
              className="flex-1 rounded-full border border-zinc-300 bg-zinc-900 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-zinc-800"
            >
              👤 Register as Tenant
            </a>
            <a
              href="/tenant-portal/login"
              className="flex-1 rounded-full border border-zinc-200 bg-[rgba(255,255,255,0.06)] py-2 text-xs font-semibold text-[#E8E8F2] transition-colors hover:text-white"
            >
              🔐 Tenant Sign In
            </a>
          </div>
        </div>

        {/* Public Vacancy Search Link */}
        <div className="mt-4 text-center">
          <a
            href="/search"
            className="inline-flex items-center gap-2 rounded-full border border-[#71717a]/30 bg-zinc-400/10 px-4 py-2 text-xs font-semibold text-zinc-500 transition-all hover:bg-zinc-400/20 hover:text-white"
          >
            <span>🔍 Looking to rent? Search Nearest Empty Properties</span>
          </a>
        </div>
      </div>
    </div>
  );
}
