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
  customType: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  images?: string[];
  listingStatus?: string;
  notes: string | null;
  vacantUnitCount: number;
  totalUnitCount: number;
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

const QUICK_TYPES = [
  'All',
  'Flat',
  'Land',
  'Hospital',
  'Hotel',
  'Villa',
  'Shop',
  'Warehouse',
  'Office',
];

export default function PublicSearchPage() {
  const [keywordInput, setKeywordInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<SearchedProperty[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e?: React.FormEvent, customTypeParam?: string) {
    if (e) e.preventDefault();
    setLoading(true);

    const typeToUse = customTypeParam !== undefined ? customTypeParam : selectedType;
    const params = new URLSearchParams();
    if (keywordInput.trim()) params.set('q', keywordInput.trim());
    if (locationInput.trim()) params.set('location', locationInput.trim());
    if (typeToUse && typeToUse !== 'All') params.set('type', typeToUse);

    try {
      const res = await fetch(`/api/public/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
      setHasSearched(true);
    }
  }

  // Initial load
  useEffect(() => {
    handleSearch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChipClick = (type: string) => {
    setSelectedType(type);
    handleSearch(undefined, type);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-white selection:text-zinc-950">
      {/* Background ambient radial glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-white/5 via-zinc-800/20 to-transparent blur-[140px]" />
        <div className="absolute top-[40%] -right-[10%] h-[400px] w-[500px] rounded-full bg-gradient-to-b from-white/5 to-transparent blur-[120px]" />
      </div>

      {/* Header / Navbar */}
      <header className="relative z-10 border-b border-white/10 bg-black/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white font-black text-zinc-950 shadow-lg">
              D
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              Domio <span className="text-xs font-semibold text-zinc-400">Property Search</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950 shadow-md transition-all hover:bg-zinc-200"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero & Search Form */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-bold text-zinc-300">
            <span>🔍 Keyword Similar Property &amp; Location Finder</span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Find Any Property by Type &amp; Location
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-400">
            Search for flats, lands, hospitals, hotels, villas, shops, or any custom property type across your preferred city or address.
          </p>

          {/* Search Form */}
          <form
            onSubmit={(e) => handleSearch(e)}
            className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 shadow-2xl backdrop-blur-md sm:flex-row"
          >
            {/* Keyword / Property Type Input */}
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                🏷️
              </span>
              <input
                type="text"
                placeholder="Property type (e.g. flat, land, hospital, hotel)..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                className="w-full rounded-xl bg-white/5 py-3 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:ring-2 focus:ring-white/20"
              />
            </div>

            {/* Location Input */}
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                📍
              </span>
              <input
                type="text"
                placeholder="Location / City (e.g. New York, London)..."
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="w-full rounded-xl bg-white/5 py-3 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:ring-2 focus:ring-white/20"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-zinc-950 shadow-md transition-all hover:bg-zinc-200 disabled:opacity-60"
            >
              {loading ? 'Searching…' : 'Search Properties'}
            </button>
          </form>

          {/* Quick Filter Chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold text-zinc-500">Popular Types:</span>
            {QUICK_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleChipClick(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  selectedType.toLowerCase() === t.toLowerCase()
                    ? 'bg-white text-zinc-950 font-bold shadow-md'
                    : 'border border-white/15 bg-white/5 text-zinc-400 hover:border-white/40 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Results Section */}
        <div className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {loading
                ? 'Searching properties…'
                : `${properties.length} Available Properties Found`}
            </h2>
            {(keywordInput || locationInput || selectedType !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setKeywordInput('');
                  setLocationInput('');
                  setSelectedType('All');
                  handleSearch(undefined, 'All');
                }}
                className="text-xs font-semibold text-zinc-400 hover:text-white hover:underline"
              >
                Clear All Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                />
              ))}
            </div>
          ) : properties.length === 0 && hasSearched ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-2xl">
                🏠
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">
                No matching properties found
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Try adjusting your search keyword, property type, or location terms.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((p) => {
                const photos =
                  p.images && p.images.length > 0
                    ? p.images
                    : [
                        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
                      ];

                return (
                  <PublicPropertyCard key={p.id} property={p} photos={photos} />
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function PublicPropertyCard({
  property: p,
  photos,
}: {
  property: SearchedProperty;
  photos: string[];
}) {
  const [currentIdx, setCurrentIdx] = useState(0);

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl transition-all hover:border-white/40 hover:bg-white/[0.08] hover:shadow-2xl">
      {/* Photo Carousel */}
      <div className="relative h-48 w-full overflow-hidden bg-black/40 select-none">
        <img
          src={photos[currentIdx]}
          alt={p.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span className="rounded-md bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
            {p.type}
          </span>
          {p.customType && (
            <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-zinc-950 shadow-xs">
              🏷️ {p.customType}
            </span>
          )}
        </div>

        {/* Carousel Arrows */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/90"
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}

        {/* Indicator dots */}
        {photos.length > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentIdx ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white group-hover:text-zinc-200 transition-colors truncate">
              {p.name}
            </h3>
            {p.displayId && (
              <span className="font-mono text-[10px] text-zinc-500">
                {p.displayId}
              </span>
            )}
          </div>

          <p className="mt-1 flex items-start gap-1 text-xs text-zinc-400">
            <span>📍</span>
            <span className="truncate">
              {p.address}, {p.city}, {p.country}
            </span>
          </p>

          {/* Pricing & Units */}
          <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-500 block text-[10px]">Rent From</span>
              <span className="font-mono font-bold text-white text-base">
                {formatCurrency(p.minRentAmount)}
                <span className="text-[10px] text-zinc-500 font-sans">/mo</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 block text-[10px]">Availability</span>
              <span className="font-bold text-emerald-400">
                {p.vacantUnitCount > 0
                  ? `${p.vacantUnitCount} Vacant Unit${p.vacantUnitCount > 1 ? 's' : ''}`
                  : `${p.totalUnitCount} Total Units`}
              </span>
            </div>
          </div>

          {/* Owner contact */}
          {p.ownerName && (
            <p className="mt-2 text-[11px] text-zinc-500">
              Listing by: <strong className="text-zinc-300">{p.ownerName}</strong>
            </p>
          )}
        </div>

        {/* Action CTA */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <Link
            href={`/register`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/5 py-2.5 text-xs font-bold text-white transition-all hover:bg-white/10 hover:border-white/40"
          >
            <span>🤝</span> Inquire / Apply as Tenant →
          </Link>
        </div>
      </div>
    </div>
  );
}
