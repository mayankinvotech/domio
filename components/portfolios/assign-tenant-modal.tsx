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

function todayISO() { return new Date().toISOString().slice(0, 10); }
function nextYearISO() {
  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

const input = 'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:ring-2 focus:ring-zinc-900/10';
const lbl = 'block text-xs font-semibold text-zinc-700 mb-1';

export default function AssignTenantModal({
  isOpen,
  onClose,
  preselectedUnit,
  vacantUnits = [],
  propertyId,
}: AssignTenantModalProps) {
  const router = useRouter();

  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantResults, setTenantResults] = useState<TenantOption[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantOption | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [startDate, setStartDate] = useState(todayISO);
  const [endDate, setEndDate] = useState(nextYearISO);
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('0');
  const [paymentDay, setPaymentDay] = useState('1');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setSelectedTenant(null); setTenantSearch(''); setTenantResults([]);
    setError(null); setSuccess(false); setPending(false);
    const uid = preselectedUnit?.id ?? vacantUnits[0]?.id ?? '';
    setSelectedUnitId(uid);
    setStartDate(todayISO()); setEndDate(nextYearISO());
    const amt = preselectedUnit?.rentAmount ?? vacantUnits[0]?.rentAmount ?? 0;
    setRent(String(amt)); setDeposit('0'); setPaymentDay('1');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Update rent when unit changes
  useEffect(() => {
    if (preselectedUnit) return;
    const u = vacantUnits.find((v) => v.id === selectedUnitId);
    if (u) setRent(String(u.rentAmount));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnitId]);

  const searchTenants = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setTenantLoading(true);
      try {
        const res = await fetch(`/api/tenants?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setTenantResults(
          (data.tenants ?? []).map((t: any) => ({
            id: t.id, displayId: t.displayId, name: t.name,
            phone: t.phone, email: t.email,
            currentUnit: t.tenancies?.[0]?.subProperty?.name ?? t.tenancies?.[0]?.rentableEntity?.name ?? null,
          })),
        );
        setShowDropdown(true);
      } catch { /* ignore */ } finally { setTenantLoading(false); }
    }, 300);
  }, []);

  function onTenantInput(v: string) {
    setTenantSearch(v); setSelectedTenant(null);
    if (v.length >= 1) searchTenants(v);
    else { setTenantResults([]); setShowDropdown(false); }
  }

  function selectTenant(t: TenantOption) {
    setSelectedTenant(t); setTenantSearch(t.name); setShowDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!selectedTenant) { setError('Please select a tenant.'); return; }
    const unit = preselectedUnit ?? vacantUnits.find((u) => u.id === selectedUnitId);
    if (!unit) { setError('Please select a unit.'); return; }
    if (!startDate || !endDate) { setError('Start and end dates are required.'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError('End date must be after start date.'); return; }
    const rentNum = Number(rent);
    if (!Number.isFinite(rentNum) || rentNum < 0) { setError('Please enter a valid monthly rent.'); return; }
    setPending(true);
    try {
      const res = await fetch('/api/tenancies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenant.id,
          subPropertyId: unit.isRentableEntity ? undefined : unit.id,
          rentableEntityId: unit.isRentableEntity ? unit.id : undefined,
          startDate, endDate, monthlyRent: rentNum,
          securityDeposit: deposit ? Number(deposit) : 0,
          paymentDayOfMonth: paymentDay ? Number(paymentDay) : 1,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { router.refresh(); onClose(); }, 900);
      } else {
        setError(json?.error ?? 'Failed to assign tenant. Please try again.');
      }
    } catch { setError('Network error. Please check your connection.'); }
    finally { setPending(false); }
  }

  if (!isOpen) return null;
  const activeUnit = preselectedUnit ?? vacantUnits.find((u) => u.id === selectedUnitId);

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Assign Tenant"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !pending) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 bg-gradient-to-r from-emerald-50 to-white">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-lg">??</span>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Assign Tenant</h2>
              {activeUnit && (
                <p className="text-xs text-zinc-500">{activeUnit.name} · {activeUnit.unitNumber}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={pending}
            className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700">
            ?
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Unit selector */}
          {!preselectedUnit && vacantUnits.length > 1 && (
            <div>
              <label className={lbl}>Vacant Unit</label>
              <select value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} className={input}>
                {vacantUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.unitNumber})</option>
                ))}
              </select>
            </div>
          )}

          {/* Tenant search */}
          <div className="relative">
            <label className={lbl}>Select Tenant *</label>
            <input type="text" placeholder="Search by name, phone, or email…"
              value={tenantSearch} onChange={(e) => onTenantInput(e.target.value)}
              onFocus={() => tenantSearch.length >= 1 && setShowDropdown(true)}
              className={input} autoComplete="off" />
            {tenantLoading && <span className="absolute right-3 top-8 text-xs text-zinc-400">Searching…</span>}
            {showDropdown && tenantResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-xl max-h-52 overflow-y-auto">
                {tenantResults.map((t) => (
                  <button key={t.id} type="button" onClick={() => selectTenant(t)}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0">
                    <div>
                      <p className="font-semibold text-zinc-900">{t.name}</p>
                      <p className="text-xs text-zinc-500">{t.phone}{t.email ? ` · ${t.email}` : ''}</p>
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
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-zinc-200 bg-white shadow-xl px-4 py-3 text-sm text-zinc-500">
                No tenants found.{' '}
                <a href="/dashboard/tenants/new" className="font-bold text-zinc-900 hover:underline">Add a tenant ?</a>
              </div>
            )}
          </div>

          {selectedTenant && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
              <span className="text-base">?</span>
              <span className="text-sm font-bold text-emerald-800">{selectedTenant.name}</span>
              <span className="text-xs text-emerald-600">{selectedTenant.phone}</span>
              <button type="button" onClick={() => { setSelectedTenant(null); setTenantSearch(''); }}
                className="ml-auto text-xs text-zinc-400 hover:text-zinc-700">?</button>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Start Date *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} required />
            </div>
            <div>
              <label className={lbl}>End Date *</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={input} required />
            </div>
          </div>

          {/* Rent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Monthly Rent *</label>
              <input type="number" min="0" step="0.01" value={rent}
                onChange={(e) => setRent(e.target.value)} placeholder="0.00" className={input} required />
            </div>
            <div>
              <label className={lbl}>Security Deposit</label>
              <input type="number" min="0" step="0.01" value={deposit}
                onChange={(e) => setDeposit(e.target.value)} placeholder="0.00" className={input} />
            </div>
          </div>

          <div className="w-1/2 pr-1.5">
            <label className={lbl}>Payment Day (1–28)</label>
            <input type="number" min="1" max="28" value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)} className={input} required />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
              ? Tenant assigned! Refreshing…
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} disabled={pending}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60">
              Cancel
            </button>
            <button type="submit" disabled={pending || success || !selectedTenant}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60">
              {pending ? (
                <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Assigning…</>
              ) : '?? Assign Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
