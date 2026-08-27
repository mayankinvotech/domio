'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SKILL_OPTIONS = [
  'Residential Leasing',
  'Commercial Office Brokerage',
  'Land & Plot Sales',
  'Hospital & Healthcare Space',
  'Hotel & Hospitality Leasing',
  'Tenant Verification & Screening',
  'Luxury Villa Rentals',
  'Warehouse & Industrial Leasing',
  'Property Management & Maintenance',
  'Legal & Rental Agreements',
];

export default function AgentRegisterPage() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState('');
  const [location, setLocation] = useState('');
  const [commissionRate, setCommissionRate] = useState('5% of Deal');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    'Residential Leasing',
    'Tenant Verification & Screening',
  ]);
  const [customSkill, setCustomSkill] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const addCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills([...selectedSkills, customSkill.trim()]);
      setCustomSkill('');
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!location.trim()) {
      setError('Please enter your primary operational location / city.');
      return;
    }

    setPending(true);

    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyName,
          location,
          commissionRate,
          skills: selectedSkills,
          bio,
          phone,
          email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          router.push('/dashboard/agent');
          return;
        }
        setError(data.error ?? 'Failed to activate agent profile.');
        setPending(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/agent');
      }, 1200);
    } catch {
      setError('Something went wrong. Please check your connection.');
      setPending(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';
  const labelClass = 'text-xs font-bold uppercase tracking-wider text-zinc-700';

  return (
    <div className="min-h-full bg-[#fafaf9] py-8 sm:py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-4 rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-2xl">
              💼
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
                Work as an Agent
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500">
                Activate your agent profile, get your personal invite link, invite property owners &amp; renters, and earn commissions.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
            {/* Agency & Location */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="agencyName" className={labelClass}>
                  Agency / Business Name <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  id="agencyName"
                  type="text"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g. Apex Realty, Independent Agent"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="location" className={labelClass}>
                  Primary Operational City / Location <span className="text-rose-500">*</span>
                </label>
                <input
                  id="location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. New York, London, Mumbai"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Commission Rate / Fee Structure */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="commissionRate" className={labelClass}>
                Your Commission Rate / Fee Structure
              </label>
              <input
                id="commissionRate"
                type="text"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                placeholder="e.g. 5% per Deal, 1 Month Rent, Flat $500"
                className={inputClass}
              />
              <p className="text-[11px] text-zinc-400">
                This is displayed to owners and tenants when they view your profile in the marketplace.
              </p>
            </div>

            {/* Skills & Specialties */}
            <div className="flex flex-col gap-2">
              <label className={labelClass}>
                Your Skills &amp; Specialties <span className="text-zinc-400 font-normal">(select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {SKILL_OPTIONS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {skill}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Skill */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Add custom skill or specialty (e.g. Hotel Brokerage)..."
                  className={`${inputClass} text-xs py-2`}
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="rounded-xl border border-zinc-300 bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-800 transition-colors hover:bg-zinc-200"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Contact details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="agentPhone" className={labelClass}>
                  Public Phone for Inquiries <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  id="agentPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Leave empty to use account phone"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="agentEmail" className={labelClass}>
                  Public Email for Inquiries <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  id="agentEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Leave empty to use account email"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Bio / Experience */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bio" className={labelClass}>
                Agent Bio / Experience <span className="text-zinc-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell property owners and tenants about your experience, past deals, and track record..."
                className={inputClass}
              />
            </div>

            {/* Error / Success Messages */}
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"
              >
                ✓ Agent profile activated! Redirecting to your Agent Dashboard…
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-2xl bg-zinc-900 py-3.5 text-sm font-bold text-white shadow-lg shadow-zinc-900/10 transition-all hover:bg-zinc-800 disabled:opacity-50"
            >
              {pending ? 'Activating Agent Profile…' : 'Activate My Agent Profile & Generate Invite Link →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
