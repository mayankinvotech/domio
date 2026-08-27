'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Agent = {
  id: string;
  displayId: string | null;
  name: string;
  agencyName: string | null;
  location: string;
  skills: string[];
  commissionRate: string;
  bio: string | null;
  inviteCode: string;
  rating: number;
  reviewCount: number;
  totalDeals: number;
  phone: string | null;
  email: string | null;
};

const SKILL_FILTERS = [
  'All',
  'Residential Leasing',
  'Commercial Office Brokerage',
  'Land & Plot Sales',
  'Hospital & Healthcare Space',
  'Hotel & Hospitality Leasing',
  'Tenant Verification & Screening',
  'Luxury Villa Rentals',
  'Warehouse & Industrial Leasing',
];

export default function AgentsDirectoryPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationInput, setLocationInput] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Hire Modal State
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [hireModalOpen, setHireModalOpen] = useState(false);
  const [clientRole, setClientRole] = useState<'OWNER' | 'RENTER'>('OWNER');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [serviceNeeded, setServiceNeeded] = useState('Find Tenants');
  const [budgetOrRent, setBudgetOrRent] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hireSuccess, setHireSuccess] = useState(false);
  const [hireError, setHireError] = useState<string | null>(null);

  async function fetchAgents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (locationInput.trim()) params.set('location', locationInput.trim());
      if (selectedSkill !== 'All') params.set('skill', selectedSkill);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/agents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAgents();
  }, [selectedSkill]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAgents();
  };

  const openHireModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setHireSuccess(false);
    setHireError(null);
    setHireModalOpen(true);
  };

  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;
    setSubmitting(true);
    setHireError(null);

    try {
      const res = await fetch('/api/agents/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          clientName,
          clientPhone,
          clientEmail,
          clientRole,
          location: selectedAgent.location,
          propertyType,
          serviceNeeded,
          budgetOrRent: budgetOrRent ? Number(budgetOrRent) : null,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setHireError(data.error ?? 'Failed to submit request.');
        setSubmitting(false);
        return;
      }

      setHireSuccess(true);
      setTimeout(() => {
        setHireModalOpen(false);
        setHireSuccess(false);
      }, 1800);
    } catch {
      setHireError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#fafaf9]">
      {/* ── Architectural Hero for Agent Marketplace ───────────── */}
      <section className="relative overflow-hidden bg-zinc-950 py-12 sm:py-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.8), rgba(9, 9, 11, 0.98)), url('https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1800&q=80')`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
                <span>🤝</span>
                <span>Agent &amp; Broker Marketplace</span>
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Hire Verified Agents
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-300 max-w-2xl font-normal">
                Filter property agents and brokers by <span className="font-semibold text-white">Location</span> and <span className="font-semibold text-amber-400">Specialized Skills</span> to manage your properties or find rental leases.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/agent/register"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-zinc-950 transition-all hover:bg-amber-400 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
              >
                <span>💼</span> Work as an Agent
              </Link>
            </div>
          </div>

          {/* Search Form inside Hero */}
          <form
            onSubmit={handleSearch}
            className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-12 rounded-2xl border border-white/15 bg-black/40 p-3 backdrop-blur-md"
          >
            <div className="relative sm:col-span-6">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                📍
              </span>
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Filter by city or location (e.g. New York, London)..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-400 outline-none focus:border-amber-400"
              />
            </div>

            <div className="relative sm:col-span-4">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Agent name, agency, or keyword..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder-zinc-400 outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              className="sm:col-span-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition-all hover:bg-zinc-100"
            >
              Filter Agents
            </button>
          </form>

          {/* Skill Filter Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-400 mr-1">Skills:</span>
            {SKILL_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSkill(s)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  selectedSkill.toLowerCase() === s.toLowerCase()
                    ? 'bg-amber-400 text-black font-bold shadow-sm'
                    : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/15 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agents Grid ────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900">
            {loading ? 'Searching agents…' : `${agents.length} Verified Agents Available`}
          </h2>
          {(locationInput || searchQuery || selectedSkill !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setLocationInput('');
                setSearchQuery('');
                setSelectedSkill('All');
              }}
              className="text-xs font-semibold text-zinc-600 hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-zinc-200 bg-white p-6"
              />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl">
              🤝
            </div>
            <h3 className="mt-4 text-lg font-bold text-zinc-900">
              No agents match your location or skill filter
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500">
              Try adjusting your city/location or selecting a different skill.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex flex-col justify-between rounded-3xl border border-zinc-200/90 bg-white p-6 shadow-xs transition-all hover:border-zinc-300 hover:shadow-md"
              >
                <div>
                  {/* Top: Location & Rating */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                      📍 {a.location}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                      ★ {a.rating.toFixed(1)} {a.reviewCount > 0 ? `(${a.reviewCount})` : ''}
                    </span>
                  </div>

                  {/* Name & Agency */}
                  <h3 className="mt-3 text-lg font-bold text-zinc-900">
                    {a.name}
                  </h3>
                  {a.agencyName && (
                    <p className="text-xs font-semibold text-zinc-500">
                      🏢 {a.agencyName}
                    </p>
                  )}

                  {/* Commission Badge */}
                  <div className="mt-2.5">
                    <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                      🏷️ Fee: {a.commissionRate}
                    </span>
                  </div>

                  {/* Bio */}
                  {a.bio && (
                    <p className="mt-3 text-xs text-zinc-600 line-clamp-3 leading-relaxed">
                      {a.bio}
                    </p>
                  )}

                  {/* Skills Pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3">
                    {a.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold text-zinc-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Contact details */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                    {a.phone && <span>📞 {a.phone}</span>}
                    {a.email && <span>✉️ {a.email}</span>}
                  </div>
                </div>

                {/* Hire Button */}
                <div className="mt-6 border-t border-zinc-100 pt-4">
                  <button
                    type="button"
                    onClick={() => openHireModal(a)}
                    className="w-full rounded-2xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.99]"
                  >
                    🤝 Hire / Inquire with Agent →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Hire Agent Modal ────────────────────────── */}
      {hireModalOpen && selectedAgent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setHireModalOpen(false)}
              className="absolute right-5 top-5 rounded-full bg-zinc-100 p-1.5 text-zinc-400 hover:text-zinc-700"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-xl">
                🤝
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  Hire {selectedAgent.name}
                </h3>
                <p className="text-xs text-zinc-500">
                  📍 {selectedAgent.location} · {selectedAgent.agencyName || 'Independent Agent'}
                </p>
              </div>
            </div>

            <form onSubmit={handleHireSubmit} className="mt-6 flex flex-col gap-4">
              {/* Role Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  I am hiring as
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClientRole('OWNER')}
                    className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                      clientRole === 'OWNER'
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                    }`}
                  >
                    🏢 Property Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientRole('RENTER')}
                    className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                      clientRole === 'RENTER'
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-600'
                    }`}
                  >
                    🏠 Tenant / Renter
                  </button>
                </div>
              </div>

              {/* Client Name & Phone */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Your Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="e.g. +1 555 0192"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              {/* Service Needed & Property Type */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Service Needed
                  </label>
                  <select
                    value={serviceNeeded}
                    onChange={(e) => setServiceNeeded(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                  >
                    <option value="Find Tenants">Find Tenants</option>
                    <option value="Find Rental Space">Find Rental Space</option>
                    <option value="Sell Property / Land">Sell Property / Land</option>
                    <option value="Full Property Management">Full Property Management</option>
                    <option value="Tenant Verification">Tenant Verification</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Property Type
                  </label>
                  <input
                    type="text"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    placeholder="e.g. Flat, Land, Hospital, Hotel"
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              {/* Budget / Rent */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Target Rent / Budget <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  value={budgetOrRent}
                  onChange={(e) => setBudgetOrRent(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                />
              </div>

              {/* Notes / Message */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Message / Details <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your requirements..."
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-900"
                />
              </div>

              {hireError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-600">
                  {hireError}
                </p>
              )}

              {hireSuccess && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
                  ✓ Request sent! {selectedAgent.name} will contact you shortly.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50"
              >
                {submitting ? 'Sending Request…' : 'Submit Hiring Inquiry →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
