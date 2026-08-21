import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Tenant Portal — Domio',
  description: 'View your rent history, lease information, and payment status.',
};

export default function TenantPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0A0818] text-white">
      {/* Tenant portal header — minimal, no owner sidebar */}
      <header className="border-b border-[#1A1A2A] bg-[#0E0C22]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 text-sm font-bold text-white shadow-[0_0_16px_rgba(91,79,232,0.4)]">
              D
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              Domio
              <span className="ml-1.5 rounded-full border border-zinc-200 bg-zinc-900/10 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                Tenant Portal
              </span>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>

      <footer className="border-t border-[#1A1A2A] bg-[#0E0C22] py-4 text-center text-xs text-[#4A4A6A]">
        Domio Tenant Portal · Your rental information, securely accessible anytime.
      </footer>
    </div>
  );
}
