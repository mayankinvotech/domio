'use client';

import { useEffect, useRef, useState } from 'react';

// Rows are plain objects whose keys become column headers, in order.
export type ExportValue = string | number | boolean | null | undefined;
export type ExportRow = Record<string, ExportValue>;

function cell(v: ExportValue): string {
  return v === null || v === undefined ? '' : String(v);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Pure client-side CSV — no external library. Values are quoted only when they
// contain a comma/quote/newline (so numbers stay numeric in the spreadsheet);
// embedded quotes are escaped by doubling. A UTF-8 BOM is prepended so Excel
// reads ₹ and other non-ASCII characters correctly.
function exportToCSV(data: ExportRow[], filename: string): void {
  const headers = Object.keys(data[0] ?? {});
  const esc = (v: ExportValue) => {
    const s = cell(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.map(esc).join(','),
    ...data.map((row) => headers.map((h) => esc(row[h])).join(',')),
  ];
  const blob = new Blob(['﻿' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerDownload(blob, `${filename}.csv`);
}

// Pure client-side "Excel" — tab-separated values written with a .xls
// extension, which Excel (and Numbers/LibreOffice) open directly. No library.
// Tabs/newlines inside a value are collapsed to spaces so columns stay aligned.
function exportToExcel(data: ExportRow[], filename: string): void {
  const headers = Object.keys(data[0] ?? {});
  const clean = (v: ExportValue) => cell(v).replace(/[\t\r\n]+/g, ' ');
  const lines = [
    headers.join('\t'),
    ...data.map((row) => headers.map((h) => clean(row[h])).join('\t')),
  ];
  const blob = new Blob(['﻿' + lines.join('\r\n')], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  triggerDownload(blob, `${filename}.xls`);
}

// Small themed dropdown that exports `rows` to Excel (.xls) or CSV (.csv).
export default function ExportButton({
  rows,
  filename,
  label = 'Export',
  align = 'right',
  disabled = false,
}: {
  rows: ExportRow[];
  filename: string;
  /** Kept for call-site compatibility; unused by the library-free exporter. */
  sheetName?: string;
  label?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isDisabled = disabled || rows.length === 0;

  function handleExcel() {
    setOpen(false);
    exportToExcel(rows, filename);
  }
  function handleCsv() {
    setOpen(false);
    exportToCSV(rows, filename);
  }

  const itemClass =
    'flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900';

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isDisabled}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="export-button"
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
        <span aria-hidden className="text-[10px] text-zinc-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className={
            'absolute z-50 mt-1 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg ' +
            (align === 'right' ? 'right-0' : 'left-0')
          }
        >
          <button type="button" role="menuitem" onClick={handleExcel} className={itemClass}>
            <span aria-hidden>📊</span> Download Excel (.xls)
          </button>
          <button type="button" role="menuitem" onClick={handleCsv} className={itemClass}>
            <span aria-hidden>📄</span> Download CSV (.csv)
          </button>
        </div>
      )}
    </div>
  );
}
