'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── Ledger flow diagram nodes ────────────────────────────────────────────────

function FlowStep({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 font-bold text-sm text-white">
          {step}
        </div>
        <div className="mt-2 w-px flex-1 bg-zinc-200" />
      </div>
      <div className="pb-8 pt-1 min-w-0 flex-1">
        <p className="font-bold text-sm text-zinc-900">{title}</p>
        <div className="mt-1 text-xs text-zinc-500 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function TableRow({
  child,
  parents,
  note,
}: {
  child: string;
  parents: string;
  note: string;
}) {
  return (
    <tr className="border-t border-zinc-100">
      <td className="py-3 pr-4 font-semibold text-xs text-zinc-900">{child}</td>
      <td className="py-3 pr-4 text-xs text-zinc-700">{parents}</td>
      <td className="py-3 text-xs text-zinc-500">{note}</td>
    </tr>
  );
}

export default function PricingPage() {
  const [address, setAddress] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  const sampleSuggestions = [
    '10 Downing Street, London, SW1A 2AA',
    '221B Baker Street, Marylebone, London, NW1 6XE',
    '1 Canada Square, Canary Wharf, London, E14 5AA',
    '45 Commercial Road, Limehouse, London, E14 7LA',
    '18 High Street, Kensington, London, W8 5SA',
  ];

  const filteredSuggestions = address.trim().length > 1
    ? sampleSuggestions.filter((s) => s.toLowerCase().includes(address.toLowerCase()))
    : [];

  return (
    <div className="min-h-[calc(100vh-73px)] bg-white">

      {/* ── 1. Ledger Architecture Section ─────────────────────────────── */}
      <section className="border-b border-zinc-100 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
              💳 Ledger Architecture
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-black">
              One Ledger per Lease
            </h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-500 max-w-2xl mx-auto">
              Roll-up is always a query — never a stored number. Every charge, payment, and credit is an immutable ledger entry. No pre-aggregated balances to maintain or drift out of sync.
            </p>
          </div>

          {/* Three flow cards */}
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Charge generation */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white text-lg">
                📅
              </div>
              <h3 className="mt-4 font-bold text-sm text-zinc-900">Charge Generation</h3>
              <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                When a lease is created, the system auto-generates a <code className="bg-zinc-200 rounded px-1">rent_schedules</code> row for every billing period across the full lease term. A nightly job scans for overdue schedules and posts a <code className="bg-zinc-200 rounded px-1">late_fee</code> ledger entry after the grace period passes.
              </p>
            </div>

            {/* Payment recording */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white text-lg">
                💵
              </div>
              <h3 className="mt-4 font-bold text-sm text-zinc-900">Payment Recording</h3>
              <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                Payments post as <code className="bg-zinc-200 rounded px-1">ledger_entries</code> against the lease and link back to the schedule row they satisfy. Partial payments are allowed — the schedule stays <em>partially paid</em> until the remainder comes in. Overpayments create a credit entry that offsets the next charge automatically.
              </p>
            </div>

            {/* Roll-up */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white text-lg">
                📊
              </div>
              <h3 className="mt-4 font-bold text-sm text-zinc-900">Roll-up to Any Level</h3>
              <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                Property dashboard, floor occupancy report, or any aggregate view is a recursive CTE query: walk down <code className="bg-zinc-200 rounded px-1">parent_space_id</code>, collect all <code className="bg-zinc-200 rounded px-1">lease_ids</code> under that node, then <code className="bg-zinc-200 rounded px-1">SUM</code> the ledger. No pre-aggregated numbers to maintain or get out of sync.
              </p>
            </div>
          </div>

          {/* Security deposits callout */}
          <div className="mt-6 flex gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-lg">
              🔐
            </div>
            <div>
              <p className="font-bold text-sm text-zinc-900">Security Deposits are separate</p>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                Security deposits live in a separate <code className="bg-zinc-100 rounded px-1">security_deposits</code> table — not the ledger. They are held funds, not revenue, and need their own deductions tracking when the tenant exits. Mixing them into the ledger would pollute income figures.
              </p>
            </div>
          </div>

          {/* Space hierarchy callout */}
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6">
            <p className="font-bold text-sm text-zinc-900 mb-4">
              Space Hierarchy — Valid Parent → Child Paths
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Child Type</th>
                    <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Allowed Parents</th>
                    <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Note</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRow child="Floor" parents="Property only" note="Floors always hang directly off a property" />
                  <TableRow child="Room" parents="Property or Floor" note="Skip floor → room hangs directly off property" />
                  <TableRow child="Office" parents="Property or Floor" note="Same skip-level flexibility as Room" />
                  <TableRow child="Bed" parents="Room or Floor" note="Floor → Bed skips room entirely (dorm/hostel style)" />
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[11px] text-zinc-400">
              Enforced in app logic via <code className="bg-zinc-100 rounded px-1">ALLOWED_PARENTS[ ]</code> lookup before insert — not a DB constraint. Add a new level (e.g. <em>wing</em>) by editing the config only — zero schema migrations.
            </p>
          </div>

          {/* Three key flows (stepped) */}
          <div className="mt-10">
            <p className="font-bold text-sm text-zinc-900 mb-6">How the three flows work end-to-end</p>
            <FlowStep step="1" title="Lease created → schedules auto-generated">
              On lease save, the system writes one <code className="bg-zinc-100 rounded px-1">rent_schedules</code> row per billing period for the entire lease term. The nightly job checks for overdue rows beyond the configured grace period and writes a <code className="bg-zinc-100 rounded px-1">late_fee</code> entry into <code className="bg-zinc-100 rounded px-1">ledger_entries</code>.
            </FlowStep>
            <FlowStep step="2" title="Payment recorded → schedule row updated">
              Each payment is a <code className="bg-zinc-100 rounded px-1">ledger_entries</code> row (type = <em>payment</em>) linked to the lease and back to the schedule row it covers. Partial amounts are allowed — the schedule row stays <em>partial</em> until cleared. Overpayments generate a <em>credit</em> entry automatically applied to the next due schedule.
            </FlowStep>
            <FlowStep step="3" title="Roll-up requested → recursive CTE query">
              Any aggregate report — portfolio balance, floor occupancy, property dashboard — is computed live via a recursive CTE: start at the requested node, walk all <code className="bg-zinc-100 rounded px-1">parent_space_id</code> descendants, collect the union of <code className="bg-zinc-100 rounded px-1">lease_ids</code>, then <code className="bg-zinc-100 rounded px-1">SUM(ledger_entries)</code>. The result is always current — there is no cached total to invalidate.
            </FlowStep>
          </div>

        </div>
      </section>

      {/* ── 2. Fee Comparison Search ─────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-black">
            Estate Agent Commission Fees Explained
          </h2>

          <p className="mt-4 text-base sm:text-lg text-zinc-600 font-medium">
            Find out how much our fees are in your area
          </p>

          {/* Address Search Form */}
          <div className="mt-10 text-left">
            <label className="block text-xs sm:text-sm font-bold text-zinc-800 mb-2">
              Start typing your address
            </label>
            <div className="relative">
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setSelectedAddress(null);
                }}
                placeholder="e.g. 10 Downing Street, London, SW1A 2AA"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-sm sm:text-base text-zinc-900 placeholder-zinc-400 focus:border-black focus:outline-none shadow-xs"
              />

              {/* Live Autocomplete Dropdown */}
              {filteredSuggestions.length > 0 && !selectedAddress && (
                <div className="absolute inset-x-0 top-full mt-1 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl z-20">
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setAddress(s);
                        setSelectedAddress(s);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-xs sm:text-sm text-zinc-800 hover:bg-zinc-100 transition-colors"
                    >
                      <span>📍</span>
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Instant Fee Breakdown Results */}
          {(selectedAddress || address.length > 3) && (
            <div className="mt-8 rounded-2xl border border-[#e1e2e3] bg-[#fafaf9] p-6 text-left shadow-sm animate-in fade-in duration-300">
              <h3 className="font-bold text-base text-zinc-900">
                Transparent Fee Schedule for: <span className="text-zinc-600 font-black">{address || selectedAddress}</span>
              </h3>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <p className="text-xs font-bold uppercase text-emerald-800">Domio Flat Service</p>
                  <p className="mt-1 font-mono text-2xl font-black text-emerald-700">0% Commission</p>
                  <p className="mt-1 text-xs text-emerald-900">
                    Fixed monthly ledger oversight with full tenant verification & digital rent automation.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase text-zinc-400">Traditional High-Street Agency</p>
                  <p className="mt-1 font-mono text-2xl font-black text-red-600">12% - 18% + VAT</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Substantial ongoing commission deducted from every monthly rent payout.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Link
                  href="/dashboard/tenants"
                  className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-xs sm:text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-95"
                >
                  Onboard This Property →
                </Link>
              </div>
            </div>
          )}

          {/* Institutional Landlords Note */}
          <p className="mt-12 text-xs sm:text-sm text-zinc-500">
            Are you an institutional or Build to Rent landlord with 150+ units?{' '}
            <Link href="/dashboard/portfolios" className="font-bold text-zinc-900 hover:underline">
              Click here
            </Link>
          </p>
        </div>
      </section>

    </div>
  );
}
