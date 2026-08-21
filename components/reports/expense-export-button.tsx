'use client';

import { useState } from 'react';
import { downloadReport, todayStr } from './download';

// "Export Report" on the Expenses page — uses the page's current filters.
export default function ExpenseExportButton({
  propertyId,
  category,
  dateFrom,
  dateTo,
}: {
  propertyId?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    // Default to the year-to-date window if the page has no explicit range.
    const from = dateFrom || `${new Date().getFullYear()}-01-01`;
    const to = dateTo || todayStr();
    const r = await downloadReport(
      '/api/reports/expense-report',
      { propertyId, category, dateFrom: from, dateTo: to },
      'expense-report.pdf',
    );
    if (!r.ok) setError(r.error);
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
      >
        {loading && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        Export Report
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
