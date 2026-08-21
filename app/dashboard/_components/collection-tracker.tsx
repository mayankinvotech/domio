'use client';

import { useMemo, useState } from 'react';
import {
  applyCollectionFilter,
  type CollectionMatrix,
} from '@/lib/collection-report';
import { formatMoney } from '@/lib/tenancy-types';
import ExportButton, { type ExportRow } from '@/components/ui/export-button';

type Opt = { id: string; name: string };
type PropOpt = Opt & { portfolioId: string };
type UnitOpt = { id: string; label: string; portfolioId: string; propertyId: string };

const money = (n: number) =>
  n > 0 ? formatMoney(n) : <span className="text-[#4A4A6A]">—</span>;
const owed = (n: number) =>
  n > 0 ? `-${formatMoney(n)}` : <span className="text-[#4A4A6A]">—</span>;
const owedGrand = (n: number) => (n > 0 ? `-${formatMoney(n)}` : formatMoney(0));

const selectClass =
  'h-8 rounded-lg border border-[#312D58] bg-[#17152F] px-2 text-sm text-[#E8E8F2] focus:border-zinc-700 focus:outline-none';

export default function CollectionTracker({
  matrix,
  fyStartYear,
  portfolios,
  properties,
  units,
}: {
  matrix: CollectionMatrix;
  fyStartYear: number;
  portfolios: Opt[];
  properties: PropOpt[];
  units: UnitOpt[];
}) {
  const [open, setOpen] = useState(false);
  const [portfolioId, setPortfolioId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  const propertyOptions = properties.filter(
    (p) => !portfolioId || p.portfolioId === portfolioId,
  );
  const unitOptions = units.filter(
    (u) =>
      (!portfolioId || u.portfolioId === portfolioId) &&
      (!propertyId || u.propertyId === propertyId),
  );

  const m = useMemo(
    () => applyCollectionFilter(matrix, { portfolioId, propertyId, unitId }),
    [matrix, portfolioId, propertyId, unitId],
  );

  const colName = (c: { label: string; sublabel?: string }) =>
    c.sublabel ? `${c.sublabel} — ${c.label}` : c.label;
  const exportRows: ExportRow[] = [
    {
      Month: 'Opening Balance (b/f)',
      ...Object.fromEntries(
        m.columns.map((c) => [colName(c), -(m.openingByColumn[c.id] ?? 0)]),
      ),
      Total: -m.grandOpening,
    },
    {
      Month: 'Total Due (current)',
      ...Object.fromEntries(
        m.columns.map((c) => [colName(c), -(m.dueByColumn[c.id] ?? 0)]),
      ),
      Total: -m.grandDue,
    },
    ...m.months.map((mo) => ({
      Month: mo.label,
      ...Object.fromEntries(
        m.columns.map((c) => [colName(c), m.received[c.id]?.[mo.key] ?? 0]),
      ),
      Total: m.totalByMonth[mo.key] ?? 0,
    })),
    {
      Month: 'Total Received',
      ...Object.fromEntries(
        m.columns.map((c) => [colName(c), m.totalByColumn[c.id] ?? 0]),
      ),
      Total: m.grandReceived,
    },
  ];

  async function downloadPdf() {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/reports/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fy: fyStartYear, portfolioId, propertyId, unitId }),
      });
      if (!res.ok) throw new Error('pdf failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collection-tracker-${m.fyLabel.replace(/\s/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Could not generate the PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  }

  const stickyCol =
    'sticky left-0 z-10 whitespace-nowrap border-r border-zinc-200 px-3 py-2';
  const numCell = 'whitespace-nowrap px-3 py-2 text-right tabular-nums';

  return (
    <section className="rounded-2xl border border-zinc-200 bg-[#17152F]">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📊</span>
          <div>
            <p className="font-semibold text-white">Collection Tracker</p>
            <p className="text-sm text-[#6A6A8A]">
              Payments by unit and month · {m.fyLabel}
            </p>
          </div>
        </div>
        <span
          className={
            'text-zinc-500 transition-transform ' + (open ? 'rotate-180' : '')
          }
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-zinc-200 p-4">
          {/* Filters + export */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={portfolioId}
              onChange={(e) => {
                setPortfolioId(e.target.value);
                setPropertyId('');
                setUnitId('');
              }}
              className={selectClass}
              aria-label="Filter by portfolio"
            >
              <option value="">All portfolios</option>
              {portfolios.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setUnitId('');
              }}
              className={selectClass}
              aria-label="Filter by property"
            >
              <option value="">All properties</option>
              {propertyOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className={selectClass}
              aria-label="Filter by unit"
            >
              <option value="">All units</option>
              {unitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>

            <div className="ml-auto flex items-center gap-2">
              <ExportButton
                rows={exportRows}
                filename={`collection-tracker-${m.fyLabel.replace(/\s/g, '-')}`}
                label="CSV / Excel"
              />
              <button
                type="button"
                onClick={downloadPdf}
                disabled={pdfLoading || m.columns.length === 0}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-zinc-200 bg-[rgba(255,255,255,0.06)] px-3 text-xs font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pdfLoading ? 'Generating…' : 'PDF'}
              </button>
            </div>
          </div>

          {m.columns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#312D58] p-8 text-center text-sm text-[#6A6A8A]">
              Nothing matches this filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#1A1A2A] text-xs uppercase tracking-wide text-zinc-500">
                    <th className={stickyCol + ' bg-[#1A1A2A] text-left font-medium'}>
                      Month
                    </th>
                    {m.columns.map((c) => (
                      <th
                        key={c.id}
                        className="whitespace-nowrap px-3 py-2 text-right font-medium"
                        title={colName(c)}
                      >
                        <div>{c.label}</div>
                        {c.sublabel && (
                          <div className="text-[10px] font-normal normal-case text-[#6A6A8A]">
                            {c.sublabel}
                          </div>
                        )}
                      </th>
                    ))}
                    <th className="whitespace-nowrap px-3 py-2 text-right font-semibold text-white">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening (owed, yellow) */}
                  <tr className="border-t border-[rgba(232,160,32,0.25)] bg-[rgba(232,160,32,0.06)] font-medium text-[#E8A020]">
                    <td className={stickyCol + ' bg-[#211a13] text-left'}>
                      Opening Balance (b/f)
                    </td>
                    {m.columns.map((c) => (
                      <td key={c.id} className={numCell}>
                        {owed(m.openingByColumn[c.id] ?? 0)}
                      </td>
                    ))}
                    <td className={numCell + ' font-semibold'}>
                      {owedGrand(m.grandOpening)}
                    </td>
                  </tr>
                  {/* Total Due (owed, red) */}
                  <tr className="border-y border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)] font-medium text-red-400">
                    <td className={stickyCol + ' bg-[#21141a] text-left'}>
                      Total Due (current)
                    </td>
                    {m.columns.map((c) => (
                      <td key={c.id} className={numCell}>
                        {owed(m.dueByColumn[c.id] ?? 0)}
                      </td>
                    ))}
                    <td className={numCell + ' font-semibold'}>
                      {owedGrand(m.grandDue)}
                    </td>
                  </tr>
                  {/* Monthly received */}
                  {m.months.map((mo, i) => (
                    <tr
                      key={mo.key}
                      className={
                        'border-t border-zinc-200 ' +
                        (i % 2 ? 'bg-[rgba(255,255,255,0.015)]' : '')
                      }
                    >
                      <td className={stickyCol + ' bg-[#0E0C22] text-left text-white'}>
                        {mo.label}
                      </td>
                      {m.columns.map((c) => {
                        const note = m.notes[c.id]?.[mo.key];
                        return (
                          <td
                            key={c.id}
                            className={
                              numCell +
                              ' text-zinc-500' +
                              (note ? ' cursor-help' : '')
                            }
                            title={note || undefined}
                          >
                            {money(m.received[c.id]?.[mo.key] ?? 0)}
                          </td>
                        );
                      })}
                      <td className={numCell + ' font-medium text-white'}>
                        {money(m.totalByMonth[mo.key] ?? 0)}
                      </td>
                    </tr>
                  ))}
                  {/* Total Received (green) */}
                  <tr className="border-t-2 border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.07)] font-semibold text-green-400">
                    <td className={stickyCol + ' bg-[#12211a] text-left'}>
                      Total Received
                    </td>
                    {m.columns.map((c) => (
                      <td key={c.id} className={numCell}>
                        {money(m.totalByColumn[c.id] ?? 0)}
                      </td>
                    ))}
                    <td className={numCell}>{formatMoney(m.grandReceived)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
