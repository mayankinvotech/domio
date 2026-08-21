'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/tenancy-types';
import ExportButton from '@/components/ui/export-button';

type BalanceRow = {
  tenantName: string;
  unitName: string;
  unitId: string;
  subPropertyId: string;
  propertyId: string;
  portfolioId: string;
  monthlyRent: number;
  currentBalance: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
};

// Stored dates are UTC midnight — format in UTC so the day never shifts.
const dmyFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function TenantBalanceSummary({
  portfolioId,
  propertyId,
  title = 'Tenant Balances',
}: {
  portfolioId?: string;
  propertyId?: string;
  title?: string;
}) {
  const [rows, setRows] = useState<BalanceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const qs = new URLSearchParams();
    if (propertyId) qs.set('propertyId', propertyId);
    if (portfolioId) qs.set('portfolioId', portfolioId);
    const q = qs.toString();
    const res = await fetch(`/api/tenant-balances${q ? `?${q}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows as BalanceRow[]);
    } else {
      setError('Could not load tenant balances.');
      setRows([]);
    }
  }, [portfolioId, propertyId]);

  useEffect(() => {
    setRows(null);
    load();
  }, [load]);

  const heading = (
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      {title}
    </h3>
  );

  if (rows === null) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] p-6">
        {heading}
        <p className="px-1 py-3 text-sm text-[#B0B0C8]">Loading tenant balances…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] p-6">
        {heading}
        <p className="px-1 py-3 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] p-6">
        {heading}
        <p className="px-1 py-3 text-sm text-[#B0B0C8]">
          No active tenants to show.
        </p>
      </div>
    );
  }

  const totalRent = rows.reduce((s, r) => s + r.monthlyRent, 0);
  const totalOutstanding = rows.reduce((s, r) => s + r.currentBalance, 0);

  // Rows for Excel/CSV export — mirrors the summary table columns.
  const exportRows = rows.map((r) => ({
    Tenant: r.tenantName,
    Unit: r.unitName,
    'Monthly Rent': r.monthlyRent,
    'Current Balance': r.currentBalance,
    'Last Payment': r.lastPaymentDate
      ? dmyFmt.format(new Date(r.lastPaymentDate))
      : '',
    Status: r.currentBalance < 0 ? 'Overdue' : 'Clear',
  }));

  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </h3>
        <ExportButton
          rows={exportRows}
          filename="tenant-balances"
          sheetName="Tenant Balances"
        />
      </div>
      {/* Desktop / tablet: full table (scrolls within its own box on ≥sm). */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 sm:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Tenant</th>
              <th className="px-3 py-2 font-medium">Unit</th>
              <th className="px-3 py-2 text-right font-medium">Monthly Rent</th>
              <th className="px-3 py-2 text-right font-medium">Current Balance</th>
              <th className="px-3 py-2 font-medium">Last Payment</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((r) => {
              const overdue = r.currentBalance < 0;
              const href = `/dashboard/portfolios/${r.portfolioId}/properties/${r.propertyId}/units/${r.unitId}`;
              return (
                <tr
                  key={r.subPropertyId}
                  className="transition-colors hover:bg-zinc-50"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={href}
                      className="font-medium text-white underline-offset-2 hover:text-zinc-500 hover:underline"
                    >
                      {r.tenantName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{r.unitName}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-white">
                    {formatMoney(r.monthlyRent)}
                  </td>
                  <td
                    className={
                      'whitespace-nowrap px-3 py-2 text-right font-semibold ' +
                      (overdue ? 'text-red-400' : 'text-green-400')
                    }
                  >
                    {overdue ? '−' : ''}
                    {formatMoney(Math.abs(r.currentBalance))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                    {r.lastPaymentDate
                      ? dmyFmt.format(new Date(r.lastPaymentDate))
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        'inline-block rounded-full border px-2 py-0.5 text-xs font-medium ' +
                        (overdue
                          ? 'bg-[rgba(239,68,68,0.12)] text-red-400 border-[rgba(239,68,68,0.3)]'
                          : 'bg-[rgba(34,197,94,0.12)] text-green-400 border-[rgba(34,197,94,0.3)]')
                      }
                    >
                      {overdue ? 'Overdue' : 'Clear'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 text-sm">
            <tr>
              <td className="px-3 py-2 font-semibold text-white" colSpan={2}>
                Total ({rows.length} tenant{rows.length === 1 ? '' : 's'})
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-white">
                {formatMoney(totalRent)}
              </td>
              <td
                className={
                  'whitespace-nowrap px-3 py-2 text-right font-bold ' +
                  (totalOutstanding < 0 ? 'text-red-400' : 'text-green-400')
                }
              >
                {totalOutstanding < 0 ? '−' : ''}
                {formatMoney(Math.abs(totalOutstanding))}
              </td>
              <td className="px-3 py-2 text-xs text-[#6A6A8A]" colSpan={2}>
                Total Outstanding
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile: stacked cards — avoids the wide-table horizontal overflow. */}
      <div className="space-y-3 sm:hidden">
        {rows.map((r) => {
          const overdue = r.currentBalance < 0;
          const href = `/dashboard/portfolios/${r.portfolioId}/properties/${r.propertyId}/units/${r.unitId}`;
          return (
            <div
              key={r.subPropertyId}
              className="rounded-xl border border-zinc-200 bg-[#100d24] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={href}
                  className="font-medium text-white underline-offset-2 hover:text-zinc-500 hover:underline"
                >
                  {r.tenantName}
                </Link>
                <span
                  className={
                    'shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ' +
                    (overdue
                      ? 'bg-[rgba(239,68,68,0.12)] text-red-400 border-[rgba(239,68,68,0.3)]'
                      : 'bg-[rgba(34,197,94,0.12)] text-green-400 border-[rgba(34,197,94,0.3)]')
                  }
                >
                  {overdue ? 'Overdue' : 'Clear'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#6A6A8A]">{r.unitName}</p>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                <span className="text-[#6A6A8A]">Rent</span>
                <span className="text-right text-white">{formatMoney(r.monthlyRent)}</span>
                <span className="text-[#6A6A8A]">Balance</span>
                <span
                  className={
                    'text-right font-semibold ' +
                    (overdue ? 'text-red-400' : 'text-green-400')
                  }
                >
                  {overdue ? '−' : ''}
                  {formatMoney(Math.abs(r.currentBalance))}
                </span>
                <span className="text-[#6A6A8A]">Last payment</span>
                <span className="text-right text-zinc-500">
                  {r.lastPaymentDate ? dmyFmt.format(new Date(r.lastPaymentDate)) : '—'}
                </span>
              </div>
            </div>
          );
        })}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span className="font-semibold text-white">Total Rent</span>
            <span className="text-right font-semibold text-white">
              {formatMoney(totalRent)}
            </span>
            <span className="font-semibold text-white">Total Outstanding</span>
            <span
              className={
                'text-right font-bold ' +
                (totalOutstanding < 0 ? 'text-red-400' : 'text-green-400')
              }
            >
              {totalOutstanding < 0 ? '−' : ''}
              {formatMoney(Math.abs(totalOutstanding))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
