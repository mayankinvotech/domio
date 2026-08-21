'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type PropertyListing = {
  id: string;
  title: string;
  address: string;
  price: number;
  beds: string;
  baths: string;
  type: string;
  status: 'Let' | 'Under Offer' | 'Available now';
  images: string[];
  lat: number;
  lng: number;
};

const SAMPLE_PROPERTIES: PropertyListing[] = [
  {
    id: 'prop-1',
    title: 'St. Leonards Gardens',
    address: 'St. Leonards Gardens, Hounslow, TW5 9DQ',
    price: 895,
    beds: 'Studio',
    baths: '1 Bathroom',
    type: 'Studio Apartment',
    status: 'Let',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80',
    ],
    lat: 51.478,
    lng: -0.361,
  },
  {
    id: 'prop-2',
    title: 'York Road Luxury Studio',
    address: 'York Road, Ilford, IG1 3AL',
    price: 1300,
    beds: 'Studio',
    baths: '1 Bathroom',
    type: 'Apartment',
    status: 'Let',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1502005229762-ee1b2da97a06?auto=format&fit=crop&w=600&q=80',
    ],
    lat: 51.559,
    lng: 0.071,
  },
  {
    id: 'prop-3',
    title: 'Lockesfield Place Waterfront',
    address: 'Lockesfield Place, Canary Wharf, London, E14 3JA',
    price: 950,
    beds: 'Studio',
    baths: '1 Bathroom',
    type: 'Studio',
    status: 'Under Offer',
    images: [
      'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=600&q=80',
    ],
    lat: 51.498,
    lng: -0.015,
  },
  {
    id: 'prop-4',
    title: 'Commercial Road Modern Suite',
    address: 'Commercial Road, Limehouse, London, E14 7LA',
    price: 1450,
    beds: '1 Bed',
    baths: '1 Bathroom',
    type: 'Apartment',
    status: 'Available now',
    images: [
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=600&q=80',
    ],
    lat: 51.512,
    lng: -0.041,
  },
  {
    id: 'prop-5',
    title: 'Greenwich High Road Penthouse',
    address: 'Greenwich High Road, London, SE10 8JL',
    price: 1900,
    beds: '2 Bed',
    baths: '2 Bathrooms',
    type: 'Flat',
    status: 'Available now',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
    ],
    lat: 51.478,
    lng: -0.012,
  },
  {
    id: 'prop-6',
    title: 'Kensington High Street Residence',
    address: 'Kensington High Street, London, W8 5SA',
    price: 2700,
    beds: '3 Bed',
    baths: '2 Bathrooms',
    type: 'House',
    status: 'Let',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    ],
    lat: 51.501,
    lng: -0.193,
  },
];

export default function PropertySearchPage() {
  const [query, setQuery] = useState('Canary Wharf');
  const [rentType, setRentType] = useState('To Rent');
  const [maxPrice, setMaxPrice] = useState<number | 'all'>('all');
  const [bedFilter, setBedFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredProperties = useMemo(() => {
    return SAMPLE_PROPERTIES.filter((p) => {
      const matchQuery =
        !query ||
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.address.toLowerCase().includes(query.toLowerCase());
      const matchPrice =
        maxPrice === 'all' || p.price <= (maxPrice as number);
      const matchBed =
        bedFilter === 'all' || p.beds.toLowerCase().includes(bedFilter.toLowerCase());
      return matchQuery && matchPrice && matchBed;
    });
  }, [query, maxPrice, bedFilter]);

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] overflow-hidden bg-white">
      {/* ── Top Filter Bar (Screenshot 3 exact match) ────────────────────── */}
      <div className="border-b border-[#e1e2e3] bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Location Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search location..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:border-black focus:outline-none shadow-xs"
            />
          </div>

          {/* Filter Pills */}
          <select
            value={rentType}
            onChange={(e) => setRentType(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs cursor-pointer focus:outline-none"
          >
            <option value="To Rent">To Rent ▾</option>
            <option value="For Sale">For Sale ▾</option>
          </select>

          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs cursor-pointer focus:outline-none"
          >
            <option value="all">Price ▾</option>
            <option value="1000">Up to £1,000 PCM</option>
            <option value="1500">Up to £1,500 PCM</option>
            <option value="2000">Up to £2,000 PCM</option>
            <option value="3000">Up to £3,000 PCM</option>
          </select>

          <select
            value={bedFilter}
            onChange={(e) => setBedFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs cursor-pointer focus:outline-none"
          >
            <option value="all">Beds & Baths ▾</option>
            <option value="studio">Studio</option>
            <option value="1 bed">1 Bed</option>
            <option value="2 bed">2 Bed</option>
            <option value="3 bed">3+ Bed</option>
          </select>

          <button
            type="button"
            className="hidden sm:inline-flex rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs hover:bg-zinc-50"
          >
            Home type ▾
          </button>
          <button
            type="button"
            className="hidden sm:inline-flex rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs hover:bg-zinc-50"
          >
            Sort by ▾
          </button>
          <button
            type="button"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs hover:bg-zinc-50"
          >
            More ▾
          </button>
        </div>
      </div>

      {/* ── Split Screen: Left Property Grid | Right Interactive Map ──────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Property Grid (Scrollable) */}
        <div className="w-full lg:w-[52%] overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-zinc-500">
              Showing <strong className="text-zinc-900 font-bold">{filteredProperties.length}</strong> properties in London & UK
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProperties.map((p) => {
              const isSelected = selectedId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all cursor-pointer ${
                    isSelected
                      ? 'border-black shadow-lg ring-2 ring-black/10'
                      : 'border-zinc-200 shadow-xs hover:shadow-md hover:border-zinc-300'
                  }`}
                >
                  {/* Property Image with Badge */}
                  <div className="relative h-44 w-full overflow-hidden bg-zinc-100">
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Status Badge */}
                    <span
                      className={`absolute top-2.5 left-2.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'Available now'
                          ? 'bg-white text-emerald-700 shadow-sm'
                          : p.status === 'Under Offer'
                            ? 'bg-zinc-900 text-white'
                            : 'bg-white text-zinc-900 shadow-sm'
                      }`}
                    >
                      {p.status}
                    </span>

                    {/* Carousel Dots */}
                    <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-white shadow-xs" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                      <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="p-4">
                    <p className="font-mono text-lg font-bold text-zinc-900">
                      £{p.price.toLocaleString()} <span className="text-xs font-normal text-zinc-500 font-sans">/ month</span>
                    </p>
                    <p className="mt-1 font-semibold text-xs text-zinc-800 truncate">
                      {p.address}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {p.beds} · {p.baths}
                    </p>
                    <p className="mt-2 text-[10px] text-zinc-400 font-medium">
                      Listing by: <strong className="text-zinc-600 font-semibold">Domio</strong>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Interactive Map View (Screenshot 3 exact match) */}
        <div className="hidden lg:flex flex-1 relative bg-[#e5e3df] overflow-hidden border-l border-[#e1e2e3]">
          {/* Map Base Canvas with London Roads & River Thames */}
          <svg className="absolute inset-0 h-full w-full opacity-60" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d5d3ce" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#f4f3f0" />
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* River Thames simulation */}
            <path
              d="M -50,300 C 150,320 200,280 350,340 C 450,380 600,320 800,310 C 950,300 1100,350 1300,340"
              fill="none"
              stroke="#b5d0d0"
              strokeWidth="24"
            />
            {/* Major Motorways */}
            <path d="M 50,0 L 200,800" stroke="#f0d5a0" strokeWidth="4" />
            <path d="M 0,450 L 1200,200" stroke="#f0d5a0" strokeWidth="3.5" />
            <path d="M 400,0 L 500,800" stroke="#f0d5a0" strokeWidth="4" />
            <path d="M 0,250 L 1200,500" stroke="#f0d5a0" strokeWidth="3" />
          </svg>

          {/* Area Labels */}
          <div className="absolute inset-0 pointer-events-none">
            <span className="absolute top-[22%] left-[48%] font-sans text-xs font-extrabold uppercase tracking-widest text-zinc-700">London</span>
            <span className="absolute top-[12%] left-[28%] text-[11px] font-semibold text-zinc-500">WEMBLEY</span>
            <span className="absolute top-[18%] left-[70%] text-[11px] font-semibold text-zinc-500">STRATFORD</span>
            <span className="absolute top-[32%] left-[58%] text-[11px] font-semibold text-zinc-500">CANARY WHARF</span>
            <span className="absolute top-[38%] left-[45%] text-[11px] font-semibold text-zinc-500">GREENWICH</span>
            <span className="absolute top-[34%] left-[24%] text-[11px] font-semibold text-zinc-500">HAMMERSMITH</span>
            <span className="absolute top-[48%] left-[40%] text-[11px] font-semibold text-zinc-500">BRIXTON</span>
          </div>

          {/* Interactive Price Pins (Exact match for map markers in screenshot) */}
          <div className="absolute inset-0">
            {filteredProperties.map((p, idx) => {
              const positions = [
                { top: '38%', left: '22%' }, // Hounslow
                { top: '16%', left: '76%' }, // Ilford
                { top: '31%', left: '57%' }, // Canary Wharf
                { top: '28%', left: '50%' }, // Limehouse
                { top: '40%', left: '46%' }, // Greenwich
                { top: '26%', left: '33%' }, // Kensington
              ];
              const pos = positions[idx % positions.length];
              const isSelected = selectedId === p.id;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  style={{ top: pos.top, left: pos.left }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-xs font-black shadow-md transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-black text-white scale-125 z-30 ring-4 ring-black/20'
                      : 'bg-white text-zinc-900 hover:scale-110 hover:bg-black hover:text-white z-20 border border-zinc-300'
                  }`}
                >
                  £{p.price.toLocaleString()}
                </button>
              );
            })}

            {/* Extra surrounding market price markers */}
            <div className="absolute top-[18%] left-[38%] rounded-full bg-white/90 border border-zinc-300 px-2.5 py-0.5 text-[10px] font-bold text-zinc-700">£1,050</div>
            <div className="absolute top-[12%] left-[54%] rounded-full bg-white/90 border border-zinc-300 px-2.5 py-0.5 text-[10px] font-bold text-zinc-700">£2,200</div>
            <div className="absolute top-[22%] left-[64%] rounded-full bg-white/90 border border-zinc-300 px-2.5 py-0.5 text-[10px] font-bold text-zinc-700">£1,950</div>
            <div className="absolute top-[48%] left-[58%] rounded-full bg-white/90 border border-zinc-300 px-2.5 py-0.5 text-[10px] font-bold text-zinc-700">£1,400</div>
            <div className="absolute top-[44%] left-[28%] rounded-full bg-white/90 border border-zinc-300 px-2.5 py-0.5 text-[10px] font-bold text-zinc-700">£1,350</div>
          </div>
        </div>
      </div>
    </div>
  );
}
