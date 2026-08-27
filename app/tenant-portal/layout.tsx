import type { Metadata } from 'next';
import Link from 'next/link';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Tenant Portal — Domio',
  description: 'View your rent history, lease information, and payment status.',
};

export default function TenantPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-white selection:text-black flex flex-col justify-between relative overflow-hidden">

      {/* Background architectural texture — same as homepage */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity z-0"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.8), rgba(9, 9, 11, 0.98)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80')`,
        }}
      />

      {/* Nav bar — exact homepage style */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo — identical to homepage: white bold text + grey pill */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-sans text-2xl font-black tracking-tight text-white">
              Domio
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
              Tenant Portal
            </span>
          </Link>

          {/* Nav — same pattern as homepage */}
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="hidden sm:inline-block text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              🔍 Browse Properties
            </Link>
            <Link
              href="/"
              className="rounded-full px-4 py-1.5 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
            >
              ← Home
            </Link>
            {/* White pill CTA — identical to "Sign Up Free →" on homepage */}
            <Link
              href="/login"
              className="rounded-full bg-white px-5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shadow-xs"
            >
              Owner Login →
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>

      {/* Footer — same as homepage */}
      <footer className="relative z-10 border-t border-white/10 bg-black/50 py-6 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Domio Real Estate Platform. Tenant Self-Service Portal.</p>
          <div className="flex items-center gap-4 text-zinc-400">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/search" className="hover:text-white transition-colors">Property Search</Link>
            <Link href="/login" className="hover:text-white transition-colors">Owner Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
