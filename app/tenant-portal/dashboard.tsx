'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type RentLedgerEntry = {
  id: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  paidDate: string | null;
  status: string;
  reference: string | null;
  paymentMethod: string | null;
  notes: string | null;
};

type LedgerEntry = {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string;
};

type ActiveTenancy = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  paymentDayOfMonth: number;
  unitName: string;
  unitRef: string;
  propertyName: string;
  propertyAddress: string;
  rentLedger: RentLedgerEntry[];
  ledgerEntries: LedgerEntry[];
  balance: number;
};

type PortalData = {
  tenant: { id: string; name: string; username?: string | null; phone: string; email: string | null };
  activeTenancy: ActiveTenancy | null;
  allTenancies: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
    unitName: string;
    unitRef: string;
    propertyName: string;
  }[];
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const statusColors: Record<string, string> = {
  DUE: 'border-zinc-200 bg-zinc-400/10 text-zinc-400',
  PAID: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  PARTIAL: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  OVERDUE: 'border-red-500/30 bg-red-500/10 text-red-400',
};

export default function TenantPortalDashboard() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'history'>('overview');

  useEffect(() => {
    fetch('/api/tenant-portal/me')
      .then((r) => {
        if (r.status === 401) { router.push('/tenant-portal/login'); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/tenant-portal/logout', { method: 'POST' });
    router.push('/tenant-portal/login');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-transparent" />
      </div>
    );
  }
  if (!data) return null;

  const { tenant, activeTenancy } = data;
  const balance = activeTenancy?.balance ?? 0;
  const isOverdue = balance < 0;

  const totalPaid = activeTenancy
    ? activeTenancy.rentLedger.reduce((sum, item) => sum + item.amountPaid, 0)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Welcome, {tenant.name.split(' ')[0]} 👋
            </h1>
            {tenant.username && (
              <span className="rounded-full border border-[#71717a]/30 bg-zinc-400/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-zinc-500">
                @{tenant.username}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-[#B0B0C8]">{tenant.phone}{tenant.email ? ` · ${tenant.email}` : ''}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.04)] px-4 py-1.5 text-xs font-medium text-[#B0B0C8] transition-colors hover:border-red-500/40 hover:text-red-400"
        >
          Sign Out
        </button>
      </div>

      {/* Balance & Total Paid KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className={`rounded-2xl border p-6 ${
            isOverdue
              ? 'border-red-500/30 bg-gradient-to-br from-red-900/20 to-[#17152F]'
              : 'border-emerald-500/20 bg-gradient-to-br from-emerald-900/10 to-[#17152F]'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Current Outstanding Balance
          </p>
          <p className={`mt-1 text-3xl font-bold tracking-tight ${isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
            {fmt(Math.abs(balance))}
          </p>
          <p className="mt-1 text-xs text-[#B0B0C8]">
            {isOverdue ? '⚠️ Amount outstanding — please clear your dues.' : '✅ All paid up!'}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/15 to-[#17152F] p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
            Total Rent Paid
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-400">
            {fmt(totalPaid)}
          </p>
          <p className="mt-1 text-xs text-[#B0B0C8]">
            Total payments completed to your landlord
          </p>
        </div>
      </div>

      {/* Active tenancy info */}
      {activeTenancy ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#312D58] bg-[#17152F] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Rental Unit</p>
              <p className="text-lg font-semibold text-white">{activeTenancy.unitName}</p>
              <p className="text-sm text-[#B0B0C8]">{activeTenancy.propertyName}</p>
              <p className="mt-0.5 text-xs text-[#6A6A8A]">{activeTenancy.propertyAddress}</p>
            </div>
            <div className="rounded-2xl border border-[#312D58] bg-[#17152F] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Lease Details</p>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#B0B0C8]">Monthly Rent</dt>
                  <dd className="font-semibold text-white">{fmt(activeTenancy.monthlyRent)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#B0B0C8]">Security Deposit</dt>
                  <dd className="text-[#E8E8F2]">{fmt(activeTenancy.securityDeposit)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#B0B0C8]">Payment Due Day</dt>
                  <dd className="text-[#E8E8F2]">{activeTenancy.paymentDayOfMonth}{['st','nd','rd'][activeTenancy.paymentDayOfMonth - 1] || 'th'} of month</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#B0B0C8]">Lease Period</dt>
                  <dd className="text-[#E8E8F2] text-xs">{fmtDate(activeTenancy.startDate)} → {fmtDate(activeTenancy.endDate)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-[#312D58]">
            {(['overview', 'ledger', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'border-zinc-700 text-white'
                    : 'border-transparent text-[#B0B0C8] hover:text-white'
                }`}
              >
                {tab === 'overview' ? 'Monthly Overview' : tab === 'ledger' ? 'Transactions' : 'Tenancy History'}
              </button>
            ))}
          </div>

          {/* Monthly Rent Ledger */}
          {activeTab === 'overview' && (
            <div className="overflow-hidden rounded-2xl border border-[#1A1A2A] bg-[#17152F]">
              <div className="border-b border-[#1A1A2A] bg-[#0E0C22] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Monthly Rent Schedule
              </div>
              {activeTenancy.rentLedger.length === 0 ? (
                <p className="px-5 py-6 text-sm text-[#6A6A8A]">No rent schedule entries yet.</p>
              ) : (
                <div className="divide-y divide-[#1A1A2A]">
                  {activeTenancy.rentLedger.map((entry) => (
                    <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-white">{fmtDate(entry.dueDate)}</p>
                        {entry.paidDate && (
                          <p className="text-xs text-[#6A6A8A]">Paid {fmtDate(entry.paidDate)}{entry.reference ? ` · ${entry.reference}` : ''}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-sm">
                          <p className="text-[#B0B0C8]">Due: {fmt(entry.amountDue)}</p>
                          {entry.amountPaid > 0 && (
                            <p className="text-emerald-400">Paid: {fmt(entry.amountPaid)}</p>
                          )}
                        </div>
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[entry.status] ?? 'border-gray-500/30 text-gray-300'}`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transaction Ledger */}
          {activeTab === 'ledger' && (
            <div className="overflow-hidden rounded-2xl border border-[#1A1A2A] bg-[#17152F]">
              <div className="border-b border-[#1A1A2A] bg-[#0E0C22] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                All Transactions
              </div>
              {activeTenancy.ledgerEntries.length === 0 ? (
                <p className="px-5 py-6 text-sm text-[#6A6A8A]">No transactions recorded yet.</p>
              ) : (
                <div className="divide-y divide-[#1A1A2A]">
                  {activeTenancy.ledgerEntries.map((e) => (
                    <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm text-white">{e.description}</p>
                        <p className="text-xs text-[#6A6A8A]">{fmtDate(e.date)}</p>
                      </div>
                      <span className={`text-sm font-semibold ${e.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {e.amount >= 0 ? '+' : ''}{fmt(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tenancy History */}
          {activeTab === 'history' && (
            <div className="overflow-hidden rounded-2xl border border-[#1A1A2A] bg-[#17152F]">
              <div className="border-b border-[#1A1A2A] bg-[#0E0C22] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Tenancy History
              </div>
              <div className="divide-y divide-[#1A1A2A]">
                {data.allTenancies.map((t) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="font-medium text-white">{t.unitName}</p>
                      <p className="text-xs text-[#6A6A8A]">{t.propertyName}</p>
                      <p className="text-xs text-[#6A6A8A]">{fmtDate(t.startDate)} → {fmtDate(t.endDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{fmt(t.monthlyRent)}/mo</p>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${t.status === 'ACTIVE' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-[#312D58] text-[#6A6A8A]'}`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-10 text-center">
          <p className="text-[#B0B0C8]">No active tenancy found.</p>
          <p className="mt-1 text-sm text-[#6A6A8A]">Contact your landlord if you believe this is an error.</p>
        </div>
      )}
    </div>
  );
}
