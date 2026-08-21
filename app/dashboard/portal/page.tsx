'use client';

import Link from 'next/link';

export default function LandlordPortalPage() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-white py-12 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left: Heading & Call To Action (Screenshot 5 exact match) */}
          <div>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-black leading-tight">
              We help Landlords{' '}
              <span className="block text-emerald-500">Manage</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-zinc-600 leading-relaxed max-w-lg">
              Full visibility over rental receipts, automated arrears alerts, tenant messaging, and maintenance compliance in one streamlined portal.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard/rent"
                className="rounded-xl bg-black px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-95 shadow-md"
              >
                Get a Demo
              </Link>
              <Link
                href="/dashboard/tenants/new"
                className="rounded-xl border border-black bg-white px-7 py-3.5 text-sm font-bold text-black transition-all hover:bg-zinc-50 active:scale-95 shadow-xs"
              >
                Get Started Free
              </Link>
            </div>
          </div>

          {/* Right: Floating Mockup of Landlord Portal Dashboard (Screenshot 5 exact match) */}
          <div className="relative rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl">
            {/* Header within Dashboard Mockup */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Hello, John!</h2>
                <p className="text-xs text-zinc-500">Welcome to your property dashboard</p>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                ● Live Active
              </span>
            </div>

            {/* Dashboard Tabs within Mockup */}
            <div className="mt-4 flex gap-4 overflow-x-auto text-xs font-semibold text-zinc-500 border-b border-zinc-100 pb-2">
              <span className="text-black border-b-2 border-black pb-2">Overview</span>
              <span className="hover:text-black cursor-pointer">Rent</span>
              <span className="hover:text-black cursor-pointer">Maintenance</span>
              <span className="hover:text-black cursor-pointer">Compliance</span>
              <span className="hover:text-black cursor-pointer">Utilities</span>
            </div>

            {/* KPI Cards (Screenshot 5 exact match) */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <p className="font-mono text-2xl font-black text-black">£4,550</p>
                <p className="text-xs font-semibold text-zinc-500 mt-0.5">This month rent</p>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
                <p className="font-mono text-2xl font-black text-zinc-700">3</p>
                <p className="text-xs font-semibold text-zinc-500 mt-0.5">Unread messages</p>
              </div>
            </div>

            {/* Urgent Tasks Section */}
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                Urgent Tasks
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <div>
                      <p className="font-bold text-zinc-900">Maintenance Request</p>
                      <p className="text-[11px] text-zinc-500">Unit 2A electrical radiator repair</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-700">Review ›</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-bold text-zinc-900">Tenant Offer Received</p>
                      <p className="text-[11px] text-zinc-500">£1,450 PCM offer for Commercial Rd</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-700">Accept ›</span>
                </div>
              </div>
            </div>

            {/* Tips & Updates Section */}
            <div className="mt-6 pt-4 border-t border-zinc-100">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                Tips & Updates
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-zinc-200 p-2.5 bg-zinc-50/50">
                  <p className="font-bold text-zinc-900">Gas Safety & EPC</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Certificates up to date</p>
                </div>
                <div className="rounded-xl border border-zinc-200 p-2.5 bg-zinc-50/50">
                  <p className="font-bold text-zinc-900">Tax Breakdown</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Download FY statement</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
