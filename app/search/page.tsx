'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type VacantUnit = {
  id: string;
  name: string;
  unitNumber: string;
  rentAmount: number;
  areaSqft: number | null;
  type: string;
};

type SearchedProperty = {
  id: string;
  displayId: string | null;
  name: string;
  address: string;
  city: string;
  country: string;
  type: string;
  notes: string | null;
  distanceKm: number;
  vacantUnitCount: number;
  minRentAmount: number;
  vacantUnits: VacantUnit[];
};

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function PublicSearchPage() {
  const [addressInput, setAddressInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<SearchedProperty[]>([]);
  const [searchedQuery, setSearchedQuery] = useState('');

  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(
        `/api/public/search?address=${encodeURIComponent(addressInput)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties ?? []);
        setSearchedQuery(data.query ?? '');
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  // Perform initial search on mount
  useEffect(() => {
    handleSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#0A081D] text-white selection:bg-zinc-900 selection:text-white">
      {/* Background ambient lighting */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-900/30 via-[#71717a]/15 to-transparent blur-[140px]" />
        <div className="absolute top-[40%] -right-[10%] h-[400px] w-[500px] rounded-full bg-gradient-to-b from-[#71717a]/20 to-transparent blur-[120px]" />
      </div>

      {/* Header / Navbar */}
      <header className="relative z-10 border-b border-[#312D58]/40 bg-[#0E0C22]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-zinc-900 to-zinc-700 font-bold text-white shadow-lg shadow-zinc-900/20">
              D
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Domio <span className="text-xs font-medium text-zinc-500">Vacancies</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[#B0B0C8] transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-zinc-900/20 transition-all hover:bg-zinc-800"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      {/* Hero & Address Input Form */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#71717a]/30 bg-zinc-400/10 px-4 py-1.5 text-xs font-medium text-zinc-500">
            <span>🔍 Nearest Empty Property Finder</span>
          </div>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find Vacant Properties Near You
          </h1>
          <p className="mt-3 text-base text-[#B0B0C8]">
            Enter your location or street address to explore nearest empty rental units and available spaces in real-time.
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-zinc-500">
                📍
              </span>
              <input
                type="text"
                placeholder="Enter street address, city, or neighborhood..."
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="w-full rounded-2xl border border-[#312D58] bg-[#17152F]/90 py-4 pl-12 pr-4 text-sm text-white placeholder-[#6A6A8A] shadow-xl backdrop-blur-md transition-all focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 text-sm font-semibold text-white shadow-xl shadow-zinc-900/20 transition-all hover:opacity-95 disabled:opacity-60"
            >
              {loading ? 'Searching…' : 'Search Nearest'}
            </button>
          </form>
        </div>

        {/* Search Results Section */}
        <div className="mt-14">
          <div className="flex items-center justify-between border-b border-[#312D58]/60 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Available Vacant Properties
              </h2>
              {searchedQuery ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Showing properties nearest to &quot;{searchedQuery}&quot;
                </p>
              ) : (
                <p className="mt-1 text-xs text-[#6A6A8A]">
                  Showing all properties with vacant units
                </p>
              )}
            </div>
            <span className="rounded-full border border-[#312D58] bg-[#17152F] px-3.5 py-1 text-xs font-semibold text-zinc-500">
              {properties.length} Properties Found
            </span>
          </div>

          {properties.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-[#312D58] bg-[#17152F]/50 p-12 text-center">
              <p className="text-lg font-medium text-white">No vacant properties found</p>
              <p className="mt-1 text-sm text-[#6A6A8A]">
                Try entering a different location or city address above.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {properties.map((prop) => (
                <div
                  key={prop.id}
                  className="group flex flex-col justify-between rounded-3xl border border-[#312D58] bg-[#17152F]/80 p-6 shadow-xl backdrop-blur-md transition-all hover:border-zinc-300 hover:shadow-md"
                >
                  <div>
                    {/* Header line: Type & distance */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-semibold text-purple-300">
                        {prop.type}
                      </span>
                      {searchedQuery && (
                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                          📍 {prop.distanceKm} km away
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-xl font-bold text-white transition-colors group-hover:text-zinc-500">
                      {prop.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#B0B0C8]">
                      {prop.address}, {prop.city}, {prop.country}
                    </p>

                    {/* Rent summary */}
                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#312D58] bg-[#0E0C22] p-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-[#6A6A8A]">
                          Starting Rent
                        </p>
                        <p className="text-base font-bold text-emerald-400">
                          {formatCurrency(prop.minRentAmount)}
                          <span className="text-xs font-normal text-[#6A6A8A]">/mo</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wider text-[#6A6A8A]">
                          Empty Units
                        </p>
                        <p className="text-base font-bold text-zinc-500">
                          {prop.vacantUnitCount} available
                        </p>
                      </div>
                    </div>

                    {/* Vacant units list preview */}
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Available Empty Units:
                      </p>
                      <div className="mt-2 space-y-2 max-h-36 overflow-y-auto pr-1">
                        {prop.vacantUnits.map((u) => (
                          <div
                            key={u.id}
                            className="flex items-center justify-between rounded-xl border border-[#312D58]/60 bg-[#0E0C22]/50 px-3 py-2 text-xs"
                          >
                            <span className="font-medium text-white truncate max-w-[140px]">
                              {u.name} ({u.unitNumber})
                            </span>
                            <div className="flex items-center gap-2">
                              {u.areaSqft && (
                                <span className="text-[10px] text-[#6A6A8A]">
                                  {u.areaSqft} sqft
                                </span>
                              )}
                              <span className="font-semibold text-emerald-400">
                                {formatCurrency(u.rentAmount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[#312D58] pt-4">
                    <Link
                      href={`/register?inquire=${prop.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#71717a]/40 bg-zinc-900/20 py-2.5 text-xs font-semibold text-zinc-500 transition-all hover:bg-zinc-900 hover:text-white"
                    >
                      Inquire / Apply for Rent
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
