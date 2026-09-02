'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type TenantOption = {
  id: string;
  displayId: string | null;
  name: string;
  phone: string;
  email: string | null;
  currentUnit?: string | null;
};

type FoundTenant = {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string | null;
  nationalId: string | null;
};

export type VacantUnit = {
  id: string;
  name: string;
  unitNumber: string;
  rentAmount: number;
  isRentableEntity: boolean;
};

export type AssignTenantModalProps = {
  isOpen: boolean;
  onClose: () => void;
  preselectedUnit?: VacantUnit | null;
  vacantUnits?: VacantUnit[];
  propertyId: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function nextYearISO() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

const inputClass =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/10';
const labelClass = 'block text-xs font-semibold text-zinc-700 mb-1';
const optionalTag = <span className="text-[11px] font-normal text-zinc-400">(optional)</span>;

export default function AssignTenantModal({
  isOpen,
  onClose,
  preselectedUnit,
  vacantUnits = [],
  propertyId,
}: AssignTenantModalProps) {
  const router = useRouter();

  // Mode: Select existing vs Add new tenant with full format fields
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  const [newTenantSubMode, setNewTenantSubMode] = useState<'manual' | 'username'>('manual');

  // Existing tenant search state
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantResults, setTenantResults] = useState<TenantOption[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantOption | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New tenant fields (previous format page fields)
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  // New tenant username handle lookup
  const [usernameInput, setUsernameInput] = useState('');
  const [lookingUpUsername, setLookingUpUsername] = useState(false);
  const [foundTenant, setFoundTenant] = useState<FoundTenant | null>(null);

  // Tenancy details
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(nextYearISO);
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [paymentDay, setPaymentDay] = useState('1');

  // Form status
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset states on modal open
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('existing');
    setNewTenantSubMode('manual');
    setSelectedTenant(null);
    setTenantSearch('');
    setTenantResults([]);
    setShowDropdown(false);

    setFullName('');
    setPhone('');
    setEmail('');
    setLocation('');
    setNationalId('');
    setEmergencyName('');
    setEmergencyPhone('');
    setBankAccountNumber('');
    setBankName('');

    setUsernameInput('');
    setFoundTenant(null);

    setError(null);
    setSuccess(false);
    setPending(false);

    const uid = preselectedUnit?.id ?? vacantUnits[0]?.id ?? '';
    setSelectedUnitId(uid);
    setStartDate(todayISO());
    setEndDate(nextYearISO());
    const amt = preselectedUnit?.rentAmount ?? vacantUnits[0]?.rentAmount ?? 0;
    setRent(String(amt));
    setDeposit('0');
    setPaymentDay('1');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update rent when unit changes
  useEffect(() => {
    if (preselectedUnit) return;
    const u = vacantUnits.find((v) => v.id === selectedUnitId);
    if (u) setRent(String(u.rentAmount));
  }, [selectedUnitId, vacantUnits, preselectedUnit]);

  // Existing tenant search
  const searchTenants = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setTenantLoading(true);
      try {
        const res = await fetch(`/api/tenants?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setTenantResults(
          (data.tenants ?? []).map((t: any) => ({
            id: t.id,
            displayId: t.displayId,
            name: t.name,
            phone: t.phone,
            email: t.email,
            currentUnit:
              t.tenancies?.[0]?.subProperty?.name ??
              t.tenancies?.[0]?.rentableEntity?.name ??
              null,
          })),
        );
        setShowDropdown(true);
      } catch {
        /* ignore */
      } finally {
        setTenantLoading(false);
      }
    }, 300);
  }, []);

  function onTenantInput(v: string) {
    setTenantSearch(v);
    setSelectedTenant(null);
    if (v.length >= 1) searchTenants(v);
    else {
      setTenantResults([]);
      setShowDropdown(false);
    }
  }

  function selectTenant(t: TenantOption) {
    setSelectedTenant(t);
    setTenantSearch(t.name);
    setShowDropdown(false);
  }

  // Handle username handle lookup
  async function handleLookupUsername(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!usernameInput.trim()) return;

    setError(null);
    setLookingUpUsername(true);
    setFoundTenant(null);

    try {
      const clean = usernameInput.trim().toLowerCase().replace(/^@/, '');
      const res = await fetch(`/api/tenants/by-username/${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `No registered tenant found with handle "@${clean}".`);
        return;
      }
      setFoundTenant(data.tenant);
    } catch {
      setError('Failed to lookup username. Please try again.');
    } finally {
      setLookingUpUsername(false);
    }
  }

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const unit = preselectedUnit ?? vacantUnits.find((u) => u.id === selectedUnitId);
    if (!unit) {
      setError('Please select a unit to assign.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date.');
      return;
    }

    const rentNum = Number(rent);
    if (!Number.isFinite(rentNum) || rentNum < 0) {
      setError('Please enter a valid monthly rent.');
      return;
    }

    setPending(true);

    try {
      let targetTenantId: string | null = null;

      if (activeTab === 'existing') {
        if (!selectedTenant) {
          setError('Please select an existing tenant or switch to "Add New Tenant".');
          setPending(false);
          return;
        }
        targetTenantId = selectedTenant.id;
      } else {
        // ActiveTab is 'new' — create or link tenant first
        if (newTenantSubMode === 'username') {
          if (!foundTenant) {
            setError('Please lookup and verify a tenant username handle first.');
            setPending(false);
            return;
          }
          const tRes = await fetch('/api/tenants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: foundTenant.username }),
          });
          const tData = await tRes.json().catch(() => null);
          if (!tRes.ok) {
            setError(tData?.error ?? 'Failed to link tenant by username.');
            setPending(false);
            return;
          }
          targetTenantId = tData?.id || foundTenant.id;
        } else {
          // Manual full tenant form creation
          if (!fullName.trim()) {
            setError('Full Name is required.');
            setPending(false);
            return;
          }
          if (!phone.trim()) {
            setError('Phone number is required.');
            setPending(false);
            return;
          }

          const tRes = await fetch('/api/tenants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: fullName.trim(),
              phone: phone.trim(),
              email: email.trim() || undefined,
              location: location.trim() || undefined,
              nationalId: nationalId.trim() || undefined,
              emergencyContactName: emergencyName.trim() || undefined,
              emergencyContactPhone: emergencyPhone.trim() || undefined,
              bankAccountNumber: bankAccountNumber.trim() || undefined,
              bankName: bankName.trim() || undefined,
            }),
          });

          const tData = await tRes.json().catch(() => null);
          if (!tRes.ok) {
            setError(tData?.error ?? 'Failed to create tenant profile.');
            setPending(false);
            return;
          }
          targetTenantId = tData.id;
        }
      }

      if (!targetTenantId) {
        setError('Could not identify tenant ID.');
        setPending(false);
        return;
      }

      // Now create the tenancy / assign unit
      const leaseRes = await fetch('/api/tenancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: targetTenantId,
          subPropertyId: unit.isRentableEntity ? undefined : unit.id,
          rentableEntityId: unit.isRentableEntity ? unit.id : undefined,
          startDate,
          endDate,
          monthlyRent: rentNum,
          securityDeposit: deposit ? Number(deposit) : 0,
          paymentDayOfMonth: paymentDay ? Number(paymentDay) : 1,
        }),
      });

      const leaseData = await leaseRes.json().catch(() => null);
      if (leaseRes.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.refresh();
          onClose();
        }, 900);
      } else {
        setError(leaseData?.error ?? 'Failed to assign tenant to unit. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  if (!isOpen) return null;
  const activeUnit = preselectedUnit ?? vacantUnits.find((u) => u.id === selectedUnitId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assign Tenant"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-gradient-to-r from-emerald-50 via-zinc-50 to-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">
              🔑
            </span>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Assign Tenant</h2>
              {activeUnit && (
                <p className="text-xs text-zinc-500 font-medium">
                  {activeUnit.name} · Unit #{activeUnit.unitNumber}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Top Mode Tabs: Existing Tenant vs Add New Tenant */}
        <div className="flex border-b border-zinc-200 bg-zinc-50/70 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('existing');
              setError(null);
            }}
            className={
              'inline-flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ' +
              (activeTab === 'existing'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-800')
            }
          >
            <span>👤 Select Existing Tenant</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('new');
              setError(null);
            }}
            className={
              'inline-flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ' +
              (activeTab === 'new'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-800')
            }
          >
            <span>+ Add New Tenant</span>
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
              Full Form
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Unit selector (if multiple vacant units available and none preselected) */}
          {!preselectedUnit && vacantUnits.length > 1 && (
            <div>
              <label className={labelClass}>Vacant Unit *</label>
              <select
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className={inputClass}
              >
                {vacantUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (#{u.unitNumber}) — ₹{u.rentAmount.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── TAB 1: Existing Tenant Search ───────────────────────────────── */}
          {activeTab === 'existing' && (
            <div className="space-y-3">
              <div className="relative">
                <label className={labelClass}>Select Tenant *</label>
                <input
                  type="text"
                  placeholder="Search by name, phone, or email…"
                  value={tenantSearch}
                  onChange={(e) => onTenantInput(e.target.value)}
                  onFocus={() => tenantSearch.length >= 1 && setShowDropdown(true)}
                  className={inputClass}
                  autoComplete="off"
                />
                {tenantLoading && (
                  <span className="absolute right-3 top-8 text-xs text-zinc-400">
                    Searching…
                  </span>
                )}

                {showDropdown && tenantResults.length > 0 && (
                  <div className="absolute z-30 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-xl max-h-52 overflow-y-auto">
                    {tenantResults.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTenant(t)}
                        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0"
                      >
                        <div>
                          <p className="font-semibold text-zinc-900">{t.name}</p>
                          <p className="text-xs text-zinc-500">
                            {t.phone}
                            {t.email ? ` · ${t.email}` : ''}
                          </p>
                        </div>
                        {t.currentUnit && (
                          <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            In: {t.currentUnit}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {showDropdown && tenantResults.length === 0 && !tenantLoading && tenantSearch.length >= 1 && (
                  <div className="absolute z-30 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-xl px-4 py-3 text-sm text-zinc-600">
                    No tenants found.{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setFullName(tenantSearch);
                        setActiveTab('new');
                        setShowDropdown(false);
                      }}
                      className="font-bold text-emerald-700 hover:underline"
                    >
                      + Create "{tenantSearch}" as New Tenant →
                    </button>
                  </div>
                )}
              </div>

              {selectedTenant && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                  <span className="text-base">👤</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-emerald-900">{selectedTenant.name}</p>
                    <p className="text-xs text-emerald-700">
                      {selectedTenant.phone}
                      {selectedTenant.email ? ` · ${selectedTenant.email}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTenant(null);
                      setTenantSearch('');
                    }}
                    className="rounded-full p-1 text-xs text-zinc-400 hover:bg-emerald-100 hover:text-zinc-700 transition"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: Full Tenant Creation Form ────────────────────────────── */}
          {activeTab === 'new' && (
            <div className="space-y-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4">
              {/* Sub-mode toggle: Manual Form vs Username Handle */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                  Tenant Profile Details
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setNewTenantSubMode('manual')}
                    className={
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                      (newTenantSubMode === 'manual'
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900')
                    }
                  >
                    Enter Manually
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTenantSubMode('username')}
                    className={
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold transition ' +
                      (newTenantSubMode === 'username'
                        ? 'bg-zinc-900 text-white'
                        : 'bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900')
                    }
                  >
                    Link @username
                  </button>
                </div>
              </div>

              {newTenantSubMode === 'username' ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">
                    Enter the tenant's self-registered handle (e.g. @john_doe).
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. @john_doe"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={handleLookupUsername}
                      disabled={lookingUpUsername || !usernameInput.trim()}
                      className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {lookingUpUsername ? 'Searching…' : 'Lookup'}
                    </button>
                  </div>

                  {foundTenant && (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3.5">
                      <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Registered Tenant Verified ✓
                      </span>
                      <p className="mt-1 font-bold text-sm text-zinc-900">{foundTenant.name}</p>
                      <p className="text-xs font-mono text-zinc-500">@{foundTenant.username}</p>
                      <div className="mt-2 text-xs text-zinc-600 grid grid-cols-2 gap-1 border-t border-emerald-200 pt-2">
                        <span>Phone: <strong>{foundTenant.phone}</strong></span>
                        <span>Email: <strong>{foundTenant.email ?? '—'}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Full Name */}
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Tenant legal full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Phone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Email {optionalTag}</label>
                      <input
                        type="email"
                        placeholder="tenant@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Location & National ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Location / Address {optionalTag}</label>
                      <input
                        type="text"
                        placeholder="Permanent city/address"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>National ID {optionalTag}</label>
                      <input
                        type="text"
                        placeholder="Aadhaar / Passport / SSN"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Emergency Contact Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Secondary Contact Name {optionalTag}</label>
                      <input
                        type="text"
                        placeholder="Relative / Emergency contact"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Secondary Contact Phone {optionalTag}</label>
                      <input
                        type="tel"
                        placeholder="Emergency phone"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Bank Account & Bank Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Bank Account Number {optionalTag}</label>
                      <input
                        type="text"
                        placeholder="For refunds or verification"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Bank Name {optionalTag}</label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC / Chase"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LEASE & TENANCY TERMS SECTION ───────────────────────────────── */}
          <div className="border-t border-zinc-200 pt-3 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-700">
              Lease &amp; Tenancy Terms
            </p>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            {/* Rent & Deposit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Monthly Rent *</label>
                <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-xs focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/10 transition">
                  <span className="shrink-0 flex items-center justify-center border-r border-zinc-200 bg-zinc-100/70 px-3 text-sm font-bold text-zinc-600 select-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    placeholder="0.00"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base font-semibold font-mono text-zinc-900 outline-none placeholder:text-zinc-400 placeholder:font-sans placeholder:font-normal"
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Security Deposit</label>
                <div className="flex overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-xs focus-within:border-zinc-900 focus-within:bg-white focus-within:ring-2 focus-within:ring-zinc-900/10 transition">
                  <span className="shrink-0 flex items-center justify-center border-r border-zinc-200 bg-zinc-100/70 px-3 text-sm font-bold text-zinc-600 select-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    placeholder="0.00"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-base font-semibold font-mono text-zinc-900 outline-none placeholder:text-zinc-400 placeholder:font-sans placeholder:font-normal"
                  />
                </div>
              </div>
            </div>

            {/* Payment Day of Month */}
            <div className="w-1/2 pr-1.5">
              <label className={labelClass}>Payment Day of Month (1–28)</label>
              <input
                type="number"
                min="1"
                max="28"
                value={paymentDay}
                onChange={(e) => setPaymentDay(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 animate-in fade-in">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 animate-in fade-in">
              ✓ Tenant successfully assigned! Refreshing…
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                pending ||
                success ||
                (activeTab === 'existing' && !selectedTenant) ||
                (activeTab === 'new' &&
                  newTenantSubMode === 'manual' &&
                  (!fullName.trim() || !phone.trim())) ||
                (activeTab === 'new' && newTenantSubMode === 'username' && !foundTenant)
              }
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {activeTab === 'new' ? 'Creating & Assigning…' : 'Assigning…'}
                </>
              ) : activeTab === 'new' ? (
                '✓ Create & Assign Tenant'
              ) : (
                '🔑 Assign Tenant'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
