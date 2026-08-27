'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────
type RentLedgerRow = {
  id: string; dueDate: string; amountDue: number; amountPaid: number;
  paidDate: string | null; status: string; reference: string | null;
  paymentMethod: string | null; notes: string | null;
};
type LedgerEntry = { id: string; type: string; amount: number; date: string; description: string; };
type Tenancy = {
  id: string; status: string; startDate: string; endDate: string;
  monthlyRent: number; securityDeposit: number; paymentDayOfMonth: number;
  unitName: string; unitRef: string; propertyName: string; propertyAddress: string;
  propertyImages: string[]; balance: number; totalDue: number; totalPaid: number;
  overdueMonths: number; rentLedger: RentLedgerRow[]; ledgerEntries: LedgerEntry[];
};
type TenantInfo = { id: string; name: string; phone: string; email: string | null; location?: string | null; };
type Summary = { totalProperties: number; activeCount: number; totalOutstanding: number; totalPaidAllTime: number; hasOverdue: boolean; };
type PortalData = { tenant: TenantInfo; tenancies: Tenancy[]; summary: Summary; };

// ── Homepage design tokens ─────────────────────────────────────────────────────
const CARD = 'rounded-xl border border-white/25 bg-black/40 backdrop-blur-md';

// Status badges
const RENT_BADGE: Record<string, string> = {
  DUE:     'border-amber-400/40 bg-amber-950/40 text-amber-300',
  PAID:    'border-emerald-400/40 bg-emerald-950/40 text-emerald-300',
  PARTIAL: 'border-blue-400/40 bg-blue-950/40 text-blue-300',
  OVERDUE: 'border-red-400/40 bg-red-950/40 text-red-300',
};
const TENANCY_BADGE: Record<string, string> = {
  ACTIVE:     'border-emerald-400/40 bg-emerald-950/40 text-emerald-300',
  EXPIRED:    'border-white/10 bg-white/5 text-zinc-400',
  TERMINATED: 'border-red-400/30 bg-red-950/30 text-red-400',
};

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtMonth(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Stat card — same style as homepage action cards ───────────────────────────
function StatCard({ icon, label, value, sub, accent = false, danger = false }: {
  icon: string; label: string; value: string; sub: string; accent?: boolean; danger?: boolean;
}) {
  return (
    <div className={`${CARD} px-4 py-5 transition-all hover:border-white/50 hover:bg-black/60 hover:scale-105`}>
      <div className="text-xl mb-3">{icon}</div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
      <p className={`mt-1.5 text-xl font-black font-mono tracking-tight ${danger ? 'text-red-300' : accent ? 'text-emerald-300' : 'text-white'}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-zinc-500">{sub}</p>
    </div>
  );
}

// ── Rent schedule ──────────────────────────────────────────────────────────────
function RentSchedule({ rows }: { rows: RentLedgerRow[] }) {
  if (!rows.length) return <p className="py-8 text-center text-xs text-zinc-500">No rent installments configured yet.</p>;
  return (
    <div className="divide-y divide-white/5">
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
          <div>
            <p className="text-sm font-bold text-white">{fmtMonth(r.dueDate)}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Due {fmtDate(r.dueDate)}{r.paidDate ? ` · Paid ${fmtDate(r.paidDate)}` : ''}{r.reference ? ` · Ref: ${r.reference}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-zinc-400">Due <span className="font-mono font-bold text-white">{fmt(r.amountDue)}</span></p>
              {r.amountPaid > 0 && <p className="text-[11px] font-mono font-bold text-emerald-300">Paid {fmt(r.amountPaid)}</p>}
            </div>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${RENT_BADGE[r.status] ?? 'border-white/10 text-zinc-400'}`}>
              {r.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Ledger entries ─────────────────────────────────────────────────────────────
function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  if (!entries.length) return <p className="py-8 text-center text-xs text-zinc-500">No transactions recorded yet.</p>;
  return (
    <div className="divide-y divide-white/5">
      {entries.map((e) => (
        <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
          <div>
            <p className="text-sm font-semibold text-white">{e.description}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{fmtDate(e.date)} · {e.type.replace('_', ' ')}</p>
          </div>
          <span className={`font-mono text-sm font-bold ${e.amount >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {e.amount >= 0 ? '+' : ''}{fmt(e.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Per-property card ─────────────────────────────────────────────────────────
function PropertyCard({ tenancy }: { tenancy: Tenancy }) {
  const [tab, setTab] = useState<'schedule' | 'ledger'>('schedule');
  const [expanded, setExpanded] = useState(false);
  const isActive = tenancy.status === 'ACTIVE';

  const daysLeft = Math.max(0, Math.ceil((new Date(tenancy.endDate).getTime() - Date.now()) / 86400000));
  const totalMs = new Date(tenancy.endDate).getTime() - new Date(tenancy.startDate).getTime();
  const elapsedMs = Date.now() - new Date(tenancy.startDate).getTime();
  const leaseProgress = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

  return (
    <div className={`${CARD} overflow-hidden shadow-xl transition-all hover:border-white/50`}>
      {/* Header */}
      <div className="px-6 pt-6 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Property identity */}
          <div className="flex items-center gap-3 min-w-0">
            {tenancy.propertyImages.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tenancy.propertyImages[0]} alt={tenancy.propertyName}
                className="h-14 w-14 rounded-xl object-cover border border-white/15 shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center text-2xl shrink-0">
                🏢
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <h3 className="text-lg font-black text-white">{tenancy.unitName}</h3>
                <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${TENANCY_BADGE[tenancy.status] ?? ''}`}>
                  {tenancy.status}
                </span>
                {tenancy.overdueMonths > 0 && (
                  <span className="inline-flex shrink-0 rounded-full border border-red-400/40 bg-red-950/40 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    ⚠️ {tenancy.overdueMonths} Overdue
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-zinc-300">{tenancy.propertyName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">📍 {tenancy.propertyAddress}</p>
            </div>
          </div>
          {/* Rent */}
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold font-mono text-white">{fmt(tenancy.monthlyRent)}</p>
            <p className="text-[11px] text-zinc-400">/ month · due {ordinal(tenancy.paymentDayOfMonth)}</p>
          </div>
        </div>

        {/* Lease progress bar */}
        {isActive && (
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
              <span>From {fmtDate(tenancy.startDate)}</span>
              <span>{daysLeft} days left · until {fmtDate(tenancy.endDate)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-white transition-all" style={{ width: `${leaseProgress}%` }} />
            </div>
          </div>
        )}

        {/* 3 KPI stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Total Due', value: fmt(tenancy.totalDue), cls: 'border-white/10 bg-white/[0.03]', v: 'text-white' },
            { label: 'Paid', value: fmt(tenancy.totalPaid), cls: 'border-emerald-400/25 bg-emerald-950/15', v: 'text-emerald-300' },
            {
              label: 'Balance',
              value: tenancy.balance < 0 ? `-${fmt(Math.abs(tenancy.balance))}` : '✓ Clear',
              cls: tenancy.balance < 0 ? 'border-red-400/25 bg-red-950/15' : 'border-emerald-400/25 bg-emerald-950/15',
              v: tenancy.balance < 0 ? 'text-red-300' : 'text-emerald-300',
            },
          ].map(({ label, value, cls, v }) => (
            <div key={label} className={`rounded-xl border p-3 text-center ${cls}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
              <p className={`mt-1 font-mono font-bold text-sm ${v}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Expand toggle — matches homepage card border hover style */}
        <button onClick={() => setExpanded((p) => !p)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/[0.03] py-2.5 text-xs font-bold text-zinc-300 hover:border-white/50 hover:bg-white/[0.07] hover:text-white transition-all cursor-pointer">
          {expanded ? '▲ Hide Details' : '▼ View Ledger & Rent Schedule'}
        </button>
      </div>

      {/* Expandable */}
      {expanded && (
        <div className="border-t border-white/10">
          <div className="flex items-center gap-1 px-5 py-3 border-b border-white/5">
            {(['schedule', 'ledger'] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  tab === k ? 'bg-white text-zinc-950' : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}>
                {k === 'schedule' ? '📅 Rent Schedule' : '💳 Transactions'}
              </button>
            ))}
          </div>
          {tab === 'schedule' ? <RentSchedule rows={tenancy.rentLedger} /> : <LedgerTable entries={tenancy.ledgerEntries} />}
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function TenantPortalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all');

  useEffect(() => {
    fetch('/api/tenant-portal/me')
      .then((r) => { if (r.status === 401) { router.push('/tenant-portal/login'); return null; } return r.json(); })
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/tenant-portal/logout', { method: 'POST' });
    router.push('/tenant-portal/login');
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-white" />
        <p className="mt-4 text-xs font-medium text-zinc-400">Loading your tenant dashboard…</p>
      </div>
    );
  }
  if (!data) return null;

  const { tenant, tenancies, summary } = data;
  const filtered = tenancies.filter((t) =>
    filter === 'active' ? t.status === 'ACTIVE' :
    filter === 'past' ? t.status !== 'ACTIVE' : true
  );

  return (
    <div className="flex flex-col gap-8">

      {/* ── Heading — same style as homepage hero ──────────────────────── */}
      <div className="text-center py-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Welcome back, {tenant.name.split(' ')[0]}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {tenant.phone}{tenant.email ? ` · ${tenant.email}` : ''}{tenant.location ? ` · 📍 ${tenant.location}` : ''}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link href="/search"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
            🔍 Find Rental
          </Link>
          <button onClick={handleLogout}
            className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold text-zinc-400 hover:text-red-300 hover:border-red-400/40 transition-colors cursor-pointer">
            Sign Out
          </button>
        </div>
      </div>

      {/* ── KPI stat cards — same as homepage action cards ─────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon="🏢" label="Active Rentals" value={String(summary.activeCount)} sub="Current tenancies" accent={summary.activeCount > 0} />
        <StatCard icon="✅" label="Total Paid" value={fmt(summary.totalPaidAllTime)} sub="All-time payments" accent />
        <StatCard icon="⚠️" label="Outstanding" value={fmt(summary.totalOutstanding)} sub="Dues pending" danger={summary.totalOutstanding > 0} />
        <StatCard icon="📜" label="Past Rentals" value={String(summary.totalProperties - summary.activeCount)} sub="Previous leases" />
      </div>

      {/* ── Property cards ─────────────────────────────────────────────── */}
      {tenancies.length === 0 ? (
        <div className={`${CARD} border-dashed p-12 text-center`}>
          <span className="text-4xl">🏠</span>
          <p className="mt-3 text-base font-bold text-white">No tenancies found yet.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Ask your landlord to link your lease, or{' '}
            <Link href="/search" className="font-bold text-white underline">search for rentals</Link>.
          </p>
          <Link href="/search"
            className="mt-5 inline-block rounded-full bg-white px-6 py-2 text-sm font-bold text-zinc-950 hover:bg-zinc-200 transition-colors">
            Search Properties →
          </Link>
        </div>
      ) : (
        <>
          {/* Filter pills — exact "Popular Types" style from homepage */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">Show:</span>
            {([
              { key: 'all', label: `All (${tenancies.length})` },
              { key: 'active', label: `Active (${summary.activeCount})` },
              { key: 'past', label: `Past (${summary.totalProperties - summary.activeCount})` },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  filter === key
                    ? 'bg-white text-zinc-950'
                    : 'border border-white/20 text-zinc-400 hover:text-white hover:bg-white/5'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-5">
            {filtered.length === 0
              ? <p className="py-8 text-center text-sm text-zinc-500">No tenancies in this category.</p>
              : filtered.map((t) => <PropertyCard key={t.id} tenancy={t} />)
            }
          </div>
        </>
      )}
    </div>
  );
}
