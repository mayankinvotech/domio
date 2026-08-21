'use client';

import { useState } from 'react';
import { downloadReport, todayStr, monthsAgoStr } from './download';

const inputClass =
  'w-full rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';

// "Download Rent Statement" for a unit's active tenancy (Unit Detail page).
export default function RentStatementButton({ tenancyId }: { tenancyId: string }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(monthsAgoStr(6));
  const [to, setTo] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    const r = await downloadReport(
      '/api/reports/rent-statement',
      { tenancyId, periodFrom: from, periodTo: to },
      'rent-statement.pdf',
    );
    if (r.ok) setOpen(false);
    else setError(r.error);
    setLoading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="rounded-full border border-zinc-200 bg-[rgba(255,255,255,0.06)] px-3 py-1.5 text-xs font-medium text-[#E8E8F2] transition-colors hover:text-white"
      >
        Download Rent Statement
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !loading && setOpen(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.95)] p-6 shadow-2xl backdrop-blur-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Rent Statement
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#E8E8F2]">Period From</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-[#E8E8F2]">Period To</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
              </div>
            </div>
            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !loading && setOpen(false)}
                disabled={loading}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={go}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
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
