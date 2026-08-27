import type { Metadata } from 'next';
import RegisterForm from './register-form';

export const metadata: Metadata = {
  title: 'Create Account — Domio',
  description: 'Create your Domio account to start managing your properties.',
};

export default function RegisterPage() {
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

      <div className="relative z-10 w-full max-w-md">
        {/* Gold wordmark */}
        <div className="mb-6 text-center">
          <span className="text-2xl font-black tracking-[0.25em] text-[#E8A020]">
            DOMIO
          </span>
        </div>

        <div className="rounded-2xl border border-[#312D58] bg-[#17152F] p-6 sm:p-8 shadow-xl backdrop-blur-sm">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
