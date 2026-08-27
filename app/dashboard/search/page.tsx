'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import SendPrivacyRequestModal, { type TargetEntity } from '@/components/privacy-requests/send-request-modal';

type PropertyItem = {
  id: string;
  displayId: string | null;
  name: string;
  address: string;
  city: string;
  country: string;
  type: string;
  customType: string | null;
  ownerId?: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  images: string[];
  listingStatus: string;
  minRentAmount: number;
  vacantUnitCount: number;
  totalUnitCount: number;
  notes: string | null;
};

// Fallback backup properties if database is empty initially
const BACKUP_PROPERTIES: PropertyItem[] = [
  {
    id: 'prop-1',
    displayId: 'PR-0001',
    name: 'St. Leonards Gardens Studio Suite',
    address: 'St. Leonards Gardens, Hounslow, TW5 9DQ',
    city: 'London',
    country: 'United Kingdom',
    type: 'RESIDENTIAL',
    customType: 'Studio Flat',
    ownerName: 'Apex Properties',
    ownerEmail: 'contact@apex.com',
    ownerPhone: '+44 20 7946 0912',
    minRentAmount: 895,
    vacantUnitCount: 1,
    totalUnitCount: 1,
    listingStatus: 'Let',
    notes: 'Modern studio with fitted kitchen and wooden flooring.',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    id: 'prop-2',
    displayId: 'PR-0002',
    name: 'York Road Luxury Residence',
    address: 'York Road, Ilford, IG1 3AL',
    city: 'London',
    country: 'United Kingdom',
    type: 'RESIDENTIAL',
    customType: 'Apartment',
    ownerName: 'Mayank Landlord',
    ownerEmail: 'owner@domio.com',
    ownerPhone: '+44 20 7946 0881',
    minRentAmount: 1300,
    vacantUnitCount: 2,
    totalUnitCount: 4,
    listingStatus: 'Let',
    notes: 'Spacious apartment near transport links and shopping centers.',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1502005229762-ee1b2da97a06?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    id: 'prop-3',
    displayId: 'PR-0003',
    name: 'Cambridge Road Modern Living',
    address: 'Cambridge Road, Kingston Upon Thames, KT1 3NG',
    city: 'London',
    country: 'United Kingdom',
    type: 'RESIDENTIAL',
    customType: 'Flat',
    ownerName: 'Kingston Estates',
    ownerEmail: 'info@kingston.com',
    ownerPhone: '+44 20 7946 0443',
    minRentAmount: 1125,
    vacantUnitCount: 1,
    totalUnitCount: 2,
    listingStatus: 'Available now',
    notes: 'Bright unit with private balcony and modern appliances.',
    images: [
      'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80',
    ],
  },
  {
    id: 'prop-4',
    displayId: 'PR-0004',
    name: 'Commercial Road Executive Suite',
    address: 'Commercial Road, Limehouse, London, E14 7LA',
    city: 'London',
    country: 'United Kingdom',
    type: 'COMMERCIAL',
    customType: 'Office / Suite',
    ownerName: 'Docklands Property Group',
    ownerEmail: 'leasing@docklands.com',
    ownerPhone: '+44 20 7946 0772',
    minRentAmount: 1450,
    vacantUnitCount: 3,
    totalUnitCount: 5,
    listingStatus: 'Available now',
    notes: 'Modern commercial space with high-speed internet and security.',
    images: [
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
    ],
  },
];

export default function PropertySearchPage() {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationQuery, setLocationQuery] = useState('London');
  const [rentType, setRentType] = useState('To Rent');
  const [maxPrice, setMaxPrice] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Request Modal state
  const [requestTarget, setRequestTarget] = useState<TargetEntity | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  async function fetchProperties() {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/search?q=${encodeURIComponent(locationQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.properties && data.properties.length > 0) {
          setProperties(data.properties);
        } else {
          setProperties(BACKUP_PROPERTIES);
        }
      } else {
        setProperties(BACKUP_PROPERTIES);
      }
    } catch {
      setProperties(BACKUP_PROPERTIES);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProperties();
  }, [locationQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchPrice =
        maxPrice === 'all' || p.minRentAmount <= (maxPrice as number);
      const matchType =
        typeFilter === 'all' ||
        (p.customType && p.customType.toLowerCase().includes(typeFilter.toLowerCase())) ||
        p.type.toLowerCase().includes(typeFilter.toLowerCase());
      return matchPrice && matchType;
    });
  }, [properties, maxPrice, typeFilter]);

  function handleSendRequest(p: PropertyItem) {
    setRequestTarget({
      receiverId: p.ownerId || p.id,
      receiverName: p.ownerName || 'Property Owner',
      receiverRole: 'OWNER',
      location: `${p.city}, ${p.country}`,
      propertyId: p.id,
      propertyName: p.name,
      propertyType: p.customType || p.type,
      defaultRequestType: 'RENT_REQUEST',
    });
    setRequestModalOpen(true);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-73px)] overflow-hidden bg-white">
      {/* ── Top Filter Toolbar (PropertyLoop Exact Match) ────────────────── */}
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
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Search location (e.g. London, New York)..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm font-medium text-zinc-900 placeholder-zinc-400 focus:border-black focus:outline-none shadow-xs"
            />
          </div>

          {/* Filter Pills */}
          <select
            value={rentType}
            onChange={(e) => setRentType(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs focus:border-black cursor-pointer"
          >
            <option value="To Rent">To Rent ▾</option>
            <option value="For Sale">For Sale ▾</option>
          </select>

          <select
            value={maxPrice === 'all' ? 'all' : String(maxPrice)}
            onChange={(e) =>
              setMaxPrice(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs focus:border-black cursor-pointer"
          >
            <option value="all">Price: Any ▾</option>
            <option value="1000">Up to £1,000 /mo</option>
            <option value="1500">Up to £1,500 /mo</option>
            <option value="2000">Up to £2,000 /mo</option>
            <option value="3000">Up to £3,000 /mo</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs focus:border-black cursor-pointer"
          >
            <option value="all">Home type: All ▾</option>
            <option value="Flat">Flat / Apartment</option>
            <option value="Studio">Studio</option>
            <option value="Land">Land / Plot</option>
            <option value="Hospital">Hospital / Healthcare</option>
            <option value="Hotel">Hotel</option>
            <option value="Villa">Villa / House</option>
            <option value="Office">Office / Commercial</option>
          </select>

          <Link
            href="/dashboard/portfolios/new"
            className="ml-auto rounded-xl bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition-all whitespace-nowrap"
          >
            + Upload Property (5 Photos)
          </Link>
        </div>
      </div>

      {/* ── Split Screen: Left Property Grid | Right Interactive Map ──────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Property Grid (Scrollable) */}
        <div className="w-full lg:w-[54%] overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm font-semibold text-zinc-500">
              Showing <strong className="text-zinc-900 font-bold">{filteredProperties.length}</strong> properties in {locationQuery || 'All Locations'}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-50" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProperties.map((p) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  isSelected={selectedId === p.id}
                  onSelect={() => setSelectedId(p.id)}
                  onRequest={() => handleSendRequest(p)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Map View (PropertyLoop exact match) */}
        <div className="hidden lg:flex flex-1 relative bg-[#e5e3df] overflow-hidden border-l border-[#e1e2e3]">
          {/* Map Base SVG */}
          <svg className="absolute inset-0 h-full w-full opacity-60" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d5d3ce" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#f4f3f0" />
            <rect width="100%" height="100%" fill="url(#map-grid)" />
            {/* Simulated Thames water channel */}
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

          {/* Interactive Price Pins */}
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
                  £{p.minRentAmount.toLocaleString()}
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

      {/* Privacy Request Modal */}
      <SendPrivacyRequestModal
        target={requestTarget}
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
      />
    </div>
  );
}

// ── Property Card with Interactive Multi-Image Carousel ───────────────────
function PropertyCard({
  property: p,
  isSelected,
  onSelect,
  onRequest,
}: {
  property: PropertyItem;
  isSelected: boolean;
  onSelect: () => void;
  onRequest: () => void;
}) {
  const images = p.images && p.images.length > 0 ? p.images : ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'];
  const [currentIdx, setCurrentIdx] = useState(0);

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div
      onClick={onSelect}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all cursor-pointer ${
        isSelected
          ? 'border-black shadow-lg ring-2 ring-black/10'
          : 'border-zinc-200 shadow-xs hover:shadow-md hover:border-zinc-300'
      }`}
    >
      {/* 5-Image Carousel Container */}
      <div className="relative h-48 w-full overflow-hidden bg-zinc-100 select-none">
        <img
          src={images[currentIdx]}
          alt={p.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Status Badge in top-left */}
        <span
          className={`absolute top-2.5 left-2.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            p.listingStatus === 'Available now'
              ? 'bg-white text-emerald-700 shadow-sm'
              : p.listingStatus === 'Under Offer'
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-900 shadow-sm'
          }`}
        >
          {p.listingStatus}
        </span>

        {/* Custom Property Type badge */}
        {p.customType && (
          <span className="absolute top-2.5 right-2.5 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
            🏷️ {p.customType}
          </span>
        )}

        {/* Carousel Arrow Controls (only show if multiple photos) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              aria-label="Previous Photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              aria-label="Next Photo"
            >
              ›
            </button>
          </>
        )}

        {/* Carousel Indicator Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
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

      {/* Property Details */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <p className="font-mono text-lg font-bold text-zinc-900">
            £{p.minRentAmount.toLocaleString()}{' '}
            <span className="text-xs font-normal text-zinc-500 font-sans">/ month</span>
          </p>
          <p className="mt-1 font-semibold text-xs text-zinc-800 truncate">
            {p.name}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500 truncate">
            📍 {p.address}, {p.city}
          </p>
          <p className="mt-1 text-[11px] font-medium text-zinc-600">
            {p.customType || p.type} · {p.vacantUnitCount > 0 ? `${p.vacantUnitCount} Vacant Space${p.vacantUnitCount > 1 ? 's' : ''}` : `${p.totalUnitCount} Total Units`}
          </p>
          <p className="mt-2 text-[10px] text-zinc-400 font-medium">
            Listing by: <strong className="text-zinc-700 font-semibold">{p.ownerName || 'Domio Owner'}</strong>
          </p>
        </div>

        {/* Action button */}
        <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequest();
            }}
            className="w-full rounded-xl bg-zinc-900 py-2 text-xs font-bold text-white shadow-xs hover:bg-zinc-800 transition-all"
          >
            🔒 Send Privacy Request / Inquire →
          </button>
        </div>
      </div>
    </div>
  );
}
