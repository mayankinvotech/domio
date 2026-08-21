'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DomioCalculator() {
  const [monthlyRent, setMonthlyRent] = useState(1700);

  const annualCollected = monthlyRent * 12;
  const automatedSavings = Math.round(annualCollected * 0.08); // 8% avg agent fee saved

  return (
    <section className="border-b border-[#e1e2e3] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          {/* Left Column: Heading & Copy */}
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl lg:text-5xl">
              See how much you can save with Domio.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-zinc-600 leading-relaxed">
              Choose Domio for a better property management experience and save over 50% in administrative fees with automated rent collection and instant ledger reconciliation.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/rent"
                className="inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-95 shadow-md"
              >
                Launch Rent Ledger →
              </Link>
            </div>
          </div>

          {/* Right Column: Interactive Slider & Calculation Box */}
          <div className="rounded-2xl border border-[#e1e2e3] bg-[#fafaf9] p-6 sm:p-8 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Estimated Annual Rent Collection
            </p>
            <p className="mt-2 text-4xl sm:text-6xl font-black text-black tracking-tight font-mono">
              ${annualCollected.toLocaleString()}
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-600">
              Monthly rental <strong className="text-black font-bold">${monthlyRent.toLocaleString()}</strong> · ${automatedSavings.toLocaleString()} avg savings/yr
            </p>

            {/* Slider Control */}
            <div className="mt-8 px-2">
              <input
                type="range"
                min="500"
                max="10000"
                step="100"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
                className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-300 accent-black transition-all"
                aria-label="Monthly rental slider"
              />
              <div className="mt-2 flex justify-between text-xs font-semibold text-zinc-500">
                <span>$500 PCM</span>
                <span>$5,000 PCM</span>
                <span>$10,000+ PCM</span>
              </div>
            </div>

            <div className="mt-6 border-t border-zinc-200 pt-4">
              <p className="text-xs text-zinc-500">
                Instant calculations based on 100% on-time automated collection ledger tracking.
              </p>
            </div>
          </div>
        </div>

        {/* Governing / Security Banner */}
        <div className="mt-16 text-center border-t border-zinc-100 pt-12">
          <h3 className="text-2xl font-bold text-black sm:text-3xl">
            You’re in safe hands
          </h3>
          <p className="mt-2 text-sm sm:text-base text-zinc-600">
            Automated double-entry ledgers with immutable audit trail and bank-grade data encryption.
          </p>
        </div>
      </div>
    </section>
  );
}
