'use client';

import { useState } from 'react';
import { downloadReport, todayStr, monthsAgoStr } from './download';

const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 shadow-xs outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 transition';

// "📊 Report" on a portfolio accordion row → portfolio summary PDF.
export default function PortfolioReportButton({
  portfolioId,
}: {
  portfolioId: string;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(monthsAgoStr(6));
  const [to, setTo] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    const r = await downloadReport(
      '/api/reports/portfolio-summary',
      { portfolioId, dateFrom: from, dateTo: to },
      'portfolio-summary.pdf',
    );
    if (r.ok) setOpen(false);
    else setError(r.error);
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs transition-all hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900"
      >
        <span>📊</span> Report
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            e.stopPropagation();
            if (!loading) setOpen(false);
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                Portfolio Summary Report
              </h2>
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Select date range for financial performance PDF export.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-700">Date From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-700">Date To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
              </div>
            </div>
            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                disabled={loading}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={go}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-60"
              >
                {loading && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {loading ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
