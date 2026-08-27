'use client';

import { useState } from 'react';
import Link from 'next/link';

const svgProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function RentIcon() {
  return (
    <svg {...svgProps}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="7" cy="15" r="1.5" />
      <path d="M14 15h4" />
    </svg>
  );
}

function TenantIcon() {
  return (
    <svg {...svgProps}>
      <path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10z" />
      <circle cx="12" cy="13" r="2.5" />
      <path d="M8.5 19a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

function PropertyIcon() {
  return (
    <svg {...svgProps}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 7h6M9 11h6M9 15h6" />
    </svg>
  );
}

function UtilityIcon() {
  return (
    <svg {...svgProps}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15h6" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg {...svgProps}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function TenantJoinIcon() {
  return (
    <svg {...svgProps}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AgentIcon() {
  return (
    <svg {...svgProps}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

export default function HomePage() {
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);

  const mainCards = [
    {
      href: '/search',
      title: 'View all properties',
      icon: <PropertyIcon />,
    },
    {
      href: '/search',
      title: 'Looking for a tenant',
      icon: <TenantIcon />,
    },
    {
      href: '/login',
      title: 'Manage my rent ledger',
      icon: <RentIcon />,
    },
    {
      href: '/login',
      title: 'Track utility bills',
      icon: <UtilityIcon />,
    },
    {
      href: '/login',
      title: 'Lease agreements & vault',
      icon: <DocumentIcon />,
    },
    {
      href: '/login',
      title: 'Financial statements',
      icon: <ReportIcon />,
    },
    {
      href: '/login',
      title: 'Log repairs & expenses',
      icon: <ExpenseIcon />,
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-[#E8A020] selection:text-black flex flex-col justify-between">
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-sans text-2xl font-black tracking-tight text-white">
              Domio
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
              Real Estate Platform
            </span>
          </Link>

          {/* Quick links & buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="hidden sm:inline-block text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              🔍 Property Search
            </Link>
            <Link
              href="/login"
              className="rounded-full px-4 py-1.5 text-xs font-bold text-zinc-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-white px-5 py-1.5 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition-colors shadow-xs"
            >
              Sign Up Free →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section with Background & Action Row ────────────────────── */}
      <main className="relative flex-1 flex flex-col justify-center overflow-hidden py-16 sm:py-24 text-white">
        {/* Background Dark Architectural Texture */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.8), rgba(9, 9, 11, 0.98)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80')`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
            Domio Property Management
          </h1>
          <p className="mt-4 text-base sm:text-xl text-zinc-300 font-normal">
            What would you like to do?
          </p>

          {/* Action Cards Row (Box of tenant and agent placed at the very end) */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {/* Standard Dashboard Cards (1 to 7) */}
            {mainCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group flex flex-col items-center justify-center rounded-xl border border-white/25 bg-black/40 px-4 py-5 backdrop-blur-md transition-all hover:border-white/70 hover:bg-black/60 hover:scale-105 active:scale-95 min-w-[135px] sm:min-w-[145px] max-w-[160px]"
              >
                <div className="flex h-11 w-11 items-center justify-center text-white transition-transform group-hover:scale-110">
                  {card.icon}
                </div>
                <span className="mt-3 text-center text-xs font-semibold leading-snug text-white">
                  {card.title}
                </span>
              </Link>
            ))}

            {/* Box 8: Join as a tenant (at the end, reveals modal on click) */}
            <button
              type="button"
              onClick={() => setTenantModalOpen(true)}
              className="group flex flex-col items-center justify-center rounded-xl border border-blue-400/40 bg-blue-950/40 px-4 py-5 backdrop-blur-md transition-all hover:border-blue-400 hover:bg-blue-900/50 hover:scale-105 active:scale-95 min-w-[135px] sm:min-w-[145px] max-w-[160px] cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center text-blue-300 transition-transform group-hover:scale-110">
                <TenantJoinIcon />
              </div>
              <span className="mt-3 text-center text-xs font-semibold leading-snug text-white">
                Join as a tenant
              </span>
            </button>

            {/* Box 9: Join as an agent (at the end, reveals modal on click) */}
            <button
              type="button"
              onClick={() => setAgentModalOpen(true)}
              className="group flex flex-col items-center justify-center rounded-xl border border-amber-400/40 bg-amber-950/40 px-4 py-5 backdrop-blur-md transition-all hover:border-amber-400 hover:bg-amber-900/50 hover:scale-105 active:scale-95 min-w-[135px] sm:min-w-[145px] max-w-[160px] cursor-pointer"
            >
              <div className="flex h-11 w-11 items-center justify-center text-amber-300 transition-transform group-hover:scale-110">
                <AgentIcon />
              </div>
              <span className="mt-3 text-center text-xs font-semibold leading-snug text-white">
                Join as an agent
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/10 bg-black/50 py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} Domio Real Estate Platform. All rights reserved.
      </footer>

      {/* ── Modal: Join As An Agent (Revealed only on click) ──────────────── */}
      {agentModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-2xl text-zinc-900 my-8">
            <button
              type="button"
              onClick={() => setAgentModalOpen(false)}
              className="absolute right-5 top-5 rounded-full bg-zinc-100 p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              ✕
            </button>

            <div className="text-center max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-900 mb-3">
                <span>💼</span>
                <span>Domio Partner Estate Agent Network</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950">
                Why Become a Domio Partner Agent?
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600">
                Partner with Domio to unlock new earnings, higher commissions, and AI-powered real estate tools.
              </p>
            </div>

            {/* 6 Benefits Grid (Matching Screenshot) */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 text-left">
              {/* Benefit 1 */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 text-zinc-900 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Increase Your Margins</h3>
                  <p className="mt-0.5 text-xs text-zinc-600 leading-relaxed">
                    Domio Partner Estate Agents can increase their margins by up to 4x.
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 text-zinc-900 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Work-Life Balance</h3>
                  <p className="mt-0.5 text-xs text-zinc-600 leading-relaxed">
                    Work smarter, not harder. Break free and spend more time with the people who matter in your life.
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 text-zinc-900 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Eliminate Overheads &amp; Fixed Costs</h3>
                  <p className="mt-0.5 text-xs text-zinc-600 leading-relaxed">
                    We help you eliminate overheads and fixed costs so you can focus on new business.
                  </p>
                </div>
              </div>

              {/* Benefit 4 */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 text-zinc-900 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Tech Company</h3>
                  <p className="mt-0.5 text-xs text-zinc-600 leading-relaxed">
                    Domio, a tech-first company, placing Estate Agents at the forefront of real estate&apos;s future.
                  </p>
                </div>
              </div>

              {/* Benefit 5 */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 text-zinc-900 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">All In One Platform</h3>
                  <p className="mt-0.5 text-xs text-zinc-600 leading-relaxed">
                    Domio&apos;s CRM eases business operations with property portals, lead gen, AI, marketing, and more.
                  </p>
                </div>
              </div>

              {/* Benefit 6 */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 text-zinc-900 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">Network &amp; Learn</h3>
                  <p className="mt-0.5 text-xs text-zinc-600 leading-relaxed">
                    Learn &amp; collaborate with the smartest, highest performing and most knowledgeable agents.
                  </p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register?role=AGENT"
                className="rounded-full bg-zinc-950 px-8 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-zinc-800 transition-all"
              >
                Join As An Agent →
              </Link>
              <Link
                href="/agents"
                className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-xs sm:text-sm font-bold text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                Browse Agent Marketplace
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Join As A Tenant (Revealed only on click) ──────────────── */}
      {tenantModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-2xl text-zinc-900 my-8">
            <button
              type="button"
              onClick={() => setTenantModalOpen(false)}
              className="absolute right-5 top-5 rounded-full bg-zinc-100 p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 transition-colors"
            >
              ✕
            </button>

            <div className="text-center max-w-xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-900 mb-3">
                <span>🏠</span>
                <span>Tenant Self-Service Hub</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950">
                Join as a Tenant / Renter
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-zinc-600">
                Access your rent ledger, lease agreements, receipts, and send confidential rental inquiries with complete privacy.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <span className="text-2xl">🔒</span>
                <h3 className="mt-2 text-xs font-bold text-zinc-900">Privacy-Protected Inquiries</h3>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Send rental requests without exposing phone or email until the landlord accepts.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <span className="text-2xl">📊</span>
                <h3 className="mt-2 text-xs font-bold text-zinc-900">Self-Service Ledger</h3>
                <p className="mt-1 text-[11px] text-zinc-500">
                  View active leases, payment receipts, balance owed, and bank details anytime.
                </p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                <span className="text-2xl">🔔</span>
                <h3 className="mt-2 text-xs font-bold text-zinc-900">Free Rent Reminders</h3>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Automated monthly reminder alerts sent via SMS &amp; Gmail before rent is due.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register?role=TENANT"
                className="rounded-full bg-blue-600 px-8 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-all"
              >
                Join As A Tenant →
              </Link>
              <Link
                href="/tenant-portal/login"
                className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-xs sm:text-sm font-bold text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                Open Tenant Portal
              </Link>
              <Link
                href="/search"
                className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-xs sm:text-sm font-bold text-zinc-800 hover:bg-zinc-100 transition-colors"
              >
                🔍 Search Properties
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
