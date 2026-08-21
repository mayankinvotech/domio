'use client';

import { useState } from 'react';
import ExportButton, { type ExportRow } from '@/components/ui/export-button';

type Opt = { id: string; name: string };
type TenancyOpt = { id: string; label: string };
type CatOpt = { value: string; label: string };

const glassCard =
  'rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] p-5 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 hover:shadow-md';
const inputClass =
  'w-full rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

type ReportKey =
  | 'rent'
  | 'expense'
  | 'property'
  | 'portfolio'
  | 'occupancy'
  | 'tenancy';

const CARDS: { key: ReportKey; icon: string; title: string; desc: string }[] = [
  { key: 'rent', icon: '📄', title: 'Rent Statement', desc: 'Per tenant, per period' },
  { key: 'expense', icon: '💰', title: 'Expense Report', desc: 'All expenses by category' },
  { key: 'property', icon: '🏠', title: 'Property Report', desc: 'Single property full overview' },
  { key: 'portfolio', icon: '📊', title: 'Portfolio Summary', desc: 'Income vs expenses' },
  { key: 'occupancy', icon: '👥', title: 'Occupancy Report', desc: 'All units status grid' },
  { key: 'tenancy', icon: '📋', title: 'Tenancy Report', desc: 'Lease details & history' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}
function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

export default function ReportsClient({
  portfolioSummary,
  portfolios,
  properties,
  tenancies,
  categories,
}: {
  portfolioSummary: ExportRow[];
  portfolios: Opt[];
  properties: Opt[];
  tenancies: TenancyOpt[];
  categories: CatOpt[];
}) {
  const [open, setOpen] = useState<ReportKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields (shared object, reset on open).
  const [tenancyId, setTenancyId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [portfolioId, setPortfolioId] = useState('');
  const [dateFrom, setDateFrom] = useState(monthsAgo(6));
  const [dateTo, setDateTo] = useState(today());
  const [category, setCategory] = useState('');
  const [expenseScope, setExpenseScope] = useState<'ALL' | 'PORTFOLIO' | 'PROPERTY'>('ALL');
  const [occScope, setOccScope] = useState<'ALL' | 'PORTFOLIO'>('ALL');

  function openModal(key: ReportKey) {
    setError(null);
    setTenancyId(tenancies[0]?.id ?? '');
    setPropertyId(properties[0]?.id ?? '');
    setPortfolioId(portfolios[0]?.id ?? '');
    setDateFrom(monthsAgo(6));
    setDateTo(today());
    setCategory('');
    setExpenseScope('ALL');
    setOccScope('ALL');
    setOpen(key);
  }

  async function generate(endpoint: string, body: object, filename: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error ?? 'Failed to generate report.');
        setLoading(false);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setOpen(null);
    } catch {
      setError('Failed to generate report.');
    }
    setLoading(false);
  }

  function submit() {
    if (open === 'rent') {
      if (!tenancyId) return setError('Select a tenant.');
      generate(
        '/api/reports/rent-statement',
        { tenancyId, periodFrom: dateFrom, periodTo: dateTo },
        'rent-statement.pdf',
      );
    } else if (open === 'expense') {
      generate(
        '/api/reports/expense-report',
        {
          dateFrom,
          dateTo,
          category: category || undefined,
          portfolioId: expenseScope === 'PORTFOLIO' ? portfolioId : undefined,
          propertyId: expenseScope === 'PROPERTY' ? propertyId : undefined,
        },
        'expense-report.pdf',
      );
    } else if (open === 'property') {
      if (!propertyId) return setError('Select a property.');
      generate('/api/reports/property-report', { propertyId }, 'property-report.pdf');
    } else if (open === 'portfolio') {
      if (!portfolioId) return setError('Select a portfolio.');
      generate(
        '/api/reports/portfolio-summary',
        { portfolioId, dateFrom, dateTo },
        'portfolio-summary.pdf',
      );
    } else if (open === 'occupancy') {
      generate(
        '/api/reports/occupancy-report',
        { portfolioId: occScope === 'PORTFOLIO' ? portfolioId : undefined },
        'occupancy-report.pdf',
      );
    } else if (open === 'tenancy') {
      if (!tenancyId) return setError('Select a tenancy.');
      generate('/api/reports/tenancy-report', { tenancyId }, 'tenancy-report.pdf');
    }
  }

  const radioBtn = (active: boolean) =>
    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors ' +
    (active
      ? 'border border-zinc-300 bg-zinc-900 text-white'
      : 'border border-[#312D58] bg-[rgba(255,255,255,0.04)] text-[#B0B0C8] hover:text-white');

  const card = CARDS.find((c) => c.key === open);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Reports
          </h1>
          <p className="mt-1 text-sm text-[#6A6A8A]">
            Generate and download PDF reports for your properties.
          </p>
        </div>
        <ExportButton
          rows={portfolioSummary}
          filename="portfolio-summary"
          sheetName="Portfolio Summary"
          label="Export Summary"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <div key={c.key} className={glassCard + ' flex flex-col'}>
            <div className="text-3xl">{c.icon}</div>
            <h3 className="mt-3 text-base font-semibold text-white">{c.title}</h3>
            <p className="mt-1 flex-1 text-sm text-[#6A6A8A]">{c.desc}</p>
            <button
              type="button"
              onClick={() => openModal(c.key)}
              className="mt-4 inline-flex w-max rounded-full border border-zinc-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Generate →
            </button>
          </div>
        ))}
      </div>

      {open && card && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !loading && setOpen(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.95)] p-6 shadow-2xl backdrop-blur-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              {card.icon} {card.title}
            </h2>

            <div className="mt-4 flex flex-col gap-4">
              {(open === 'rent' || open === 'tenancy') && (
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Tenant / Tenancy</label>
                  <select
                    value={tenancyId}
                    onChange={(e) => setTenancyId(e.target.value)}
                    className={inputClass}
                  >
                    {tenancies.length === 0 && <option value="">No active tenancies</option>}
                    {tenancies.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {open === 'expense' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <span className={labelClass}>Scope</span>
                    <div className="flex flex-wrap gap-2">
                      {(['ALL', 'PORTFOLIO', 'PROPERTY'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setExpenseScope(s)}
                          className={radioBtn(expenseScope === s)}
                        >
                          {s === 'ALL' ? 'All Properties' : s === 'PORTFOLIO' ? 'Portfolio' : 'Property'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {expenseScope === 'PORTFOLIO' && (
                    <PortfolioSelect value={portfolioId} onChange={setPortfolioId} options={portfolios} />
                  )}
                  {expenseScope === 'PROPERTY' && (
                    <PropertySelect value={propertyId} onChange={setPropertyId} options={properties} />
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <DateRange {...{ dateFrom, setDateFrom, dateTo, setDateTo }} />
                </>
              )}

              {open === 'property' && (
                <PropertySelect value={propertyId} onChange={setPropertyId} options={properties} />
              )}

              {open === 'portfolio' && (
                <>
                  <PortfolioSelect value={portfolioId} onChange={setPortfolioId} options={portfolios} />
                  <DateRange {...{ dateFrom, setDateFrom, dateTo, setDateTo }} />
                </>
              )}

              {open === 'occupancy' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <span className={labelClass}>Scope</span>
                    <div className="flex flex-wrap gap-2">
                      {(['ALL', 'PORTFOLIO'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setOccScope(s)}
                          className={radioBtn(occScope === s)}
                        >
                          {s === 'ALL' ? 'All Portfolios' : 'Portfolio'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {occScope === 'PORTFOLIO' && (
                    <PortfolioSelect value={portfolioId} onChange={setPortfolioId} options={portfolios} />
                  )}
                </>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !loading && setOpen(null)}
                disabled={loading}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {loading && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? 'Generating…' : 'Generate & Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PortfolioSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Opt[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>Portfolio</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.length === 0 && <option value="">No portfolios</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function PropertySelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Opt[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>Property</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.length === 0 && <option value="">No properties</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function DateRange({
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: {
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Date From</label>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Date To</label>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
      </div>
    </div>
  );
}
