'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

type Preview = {
  portfolios: number;
  properties: number;
  units: number;
  tenants: number;
  rentRecords: number;
  warnings: string[];
  errors: string[];
};

const cardClass =
  'rounded-2xl border border-[#312D58] bg-[rgba(23,21,47,0.6)] p-6 backdrop-blur-xl';

const SESSION_KEY = 'domio-import-state';

const STATUS_MESSAGES = [
  'Reading your file...',
  'Parsing sheet structure...',
  'Extracting tenant data...',
  'Processing payment records...',
  'Validating data...',
  'Almost done...',
];

const IMPORT_OPTIONS = [
  {
    key: 'DOMIO_TEMPLATE',
    icon: '📋',
    title: 'Domio Template Import',
    description:
      'Fill in the official Domio template and import all your data instantly. No AI processing needed.',
    subText: 'Portfolios, Properties, Units, Tenants, Rent History & more',
    badge: '✅ RECOMMENDED',
    badgeClass:
      'border border-green-500/30 bg-green-500/10 text-green-400',
    enabled: true,
  },
  {
    key: 'BANK_STATEMENT',
    icon: '🏦',
    title: 'Bank Statement',
    description: 'Reconcile rent payments from a bank statement export.',
    subText: '',
    badge: 'COMING SOON',
    badgeClass:
      'border border-[#312D58] bg-[rgba(255,255,255,0.06)] text-zinc-500',
    enabled: false,
  },
  {
    key: 'EXPENSE_IMPORT',
    icon: '📊',
    title: 'Expense Import',
    description: 'Bulk import historical expenses against your properties.',
    subText: '',
    badge: 'COMING SOON',
    badgeClass:
      'border border-[#312D58] bg-[rgba(255,255,255,0.06)] text-zinc-500',
    enabled: false,
  },
];

export default function ImportWizard(_props: {
  portfolios?: { id: string; name: string }[];
}) {
  const [step, setStep] = useState(1);

  // Step 1
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  // Step 3
  const [importing, setImporting] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [done, setDone] = useState(false);

  // Persist wizard progress so a refresh / back-navigation doesn't lose it.
  useEffect(() => {
    if (jobId && !done) {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ step, jobId, preview }),
      );
    }
  }, [step, jobId, preview, done]);

  // Restore on mount (only mid-flight imports — those with a jobId).
  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (!saved) return;
    try {
      const s = JSON.parse(saved) as {
        step: number;
        jobId: string | null;
        preview: Preview | null;
      };
      if (s.jobId) {
        setStep(s.step);
        setJobId(s.jobId);
        setPreview(s.preview);
      }
    } catch {
      /* ignore malformed state */
    }
  }, []);

  // Clear persisted state and reset the wizard to the start.
  function handleReset() {
    sessionStorage.removeItem(SESSION_KEY);
    setStep(1);
    setFile(null);
    setJobId(null);
    setPreview(null);
    setDone(false);
    setError(null);
  }

  function pickFile(f: File | null) {
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'csv') {
      setFile(null);
      setError('Unsupported file. Upload the Domio template (.xlsx, .xls or .csv).');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setFile(null);
      setError('File exceeds the 10MB limit.');
      return;
    }
    setFile(f);
    setError(null);
  }

  // Step 1 → 2: parse the template server-side (no AI), get instant counts.
  async function uploadTemplate() {
    if (!file) {
      setError('Please choose your filled-in template file.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/imports/template', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not read the template.');
      setJobId(data.jobId);
      setPreview(data.preview as Preview);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  // Step 3: commit the parsed template to the database.
  async function confirmImport() {
    if (!jobId) return;
    setImporting(true);
    setError(null);
    setStatusIndex(0);
    // Cycle real status messages instead of a fake percentage.
    const timer = setInterval(
      () => setStatusIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1)),
      8000,
    );
    try {
      const res = await fetch('/api/imports/template/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');
      sessionStorage.removeItem(SESSION_KEY);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      clearInterval(timer);
      setImporting(false);
    }
  }

  return (
    <div>
      <Stepper step={step} />

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      {/* STEP 1 — choose type + upload template */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {IMPORT_OPTIONS.map((opt) => (
              <div
                key={opt.key}
                className={
                  'rounded-2xl border p-5 transition-all ' +
                  (opt.enabled
                    ? 'border-zinc-700 bg-zinc-900/10 shadow-[0_0_24px_rgba(91,79,232,0.25)]'
                    : 'pointer-events-none cursor-not-allowed border-[#312D58] bg-[rgba(23,21,47,0.6)] opacity-40')
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-2xl">{opt.icon}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${opt.badgeClass}`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {opt.title}
                </div>
                <div className="mt-1 text-xs text-[#B0B0C8]">
                  {opt.description}
                </div>
                {opt.subText && (
                  <div className="mt-2 text-[11px] text-zinc-500">
                    {opt.subText}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Download the official template */}
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-zinc-200 bg-[rgba(23,21,47,0.6)] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                Don&apos;t have the template yet?
              </p>
              <p className="text-xs text-[#B0B0C8]">
                Download it, fill in your data, then upload it below.
              </p>
            </div>
            <a
              href="/templates/Domio_Import_Template.xlsx"
              download
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white"
            >
              ⬇ Download Template
            </a>
          </div>

          {/* Upload zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pickFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={
              'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ' +
              (dragging
                ? 'border-zinc-700 bg-zinc-900/10'
                : 'border-[#312D58] bg-[rgba(23,21,47,0.4)]')
            }
          >
            <div className="text-3xl">📋</div>
            <p className="mt-3 text-sm font-medium text-white">
              {file ? file.name : 'Drag & drop your filled-in template here'}
            </p>
            <p className="mt-1 text-xs text-[#B0B0C8]">
              The Domio template (.xlsx) · up to 10MB
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-4 rounded-full border border-zinc-300 bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white"
            >
              {file ? 'Choose a different file' : 'Browse files'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={uploadTemplate}
              disabled={!file || uploading}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {uploading && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {uploading ? 'Reading template…' : 'Preview Data →'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — preview parsed data */}
      {step === 2 && preview && (
        <div className="space-y-6">
          <section className={cardClass}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Preview
            </h3>
            <p className="mt-1 text-sm text-[#B0B0C8]">
              Parsed instantly from your template — no AI processing.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <CountRow label="Portfolios found" value={preview.portfolios} />
              <CountRow label="Properties found" value={preview.properties} />
              <CountRow label="Units found" value={preview.units} />
              <CountRow label="Tenants found" value={preview.tenants} />
              <CountRow
                label="Rent Payment records found"
                value={preview.rentRecords}
              />
              <li className="flex items-center gap-2">
                <span>{preview.warnings.length > 0 ? '⚠️' : '✅'}</span>
                <span className="text-[#E8E8F2]">
                  {preview.warnings.length} warning
                  {preview.warnings.length === 1 ? '' : 's'}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span>{preview.errors.length > 0 ? '❌' : '✅'}</span>
                <span className="text-[#E8E8F2]">
                  {preview.errors.length} error
                  {preview.errors.length === 1 ? '' : 's'}
                </span>
              </li>
            </ul>
          </section>

          {preview.warnings.length > 0 && (
            <section className={cardClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8A020]">
                ⚠️ Warnings
              </h3>
              <ul className="mt-3 space-y-1.5">
                {preview.warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#E8E8F2]">
                    <span>⚠️</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {preview.errors.length > 0 && (
            <section className={cardClass}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-red-400">
                ❌ Errors
              </h3>
              <ul className="mt-3 space-y-1.5">
                {preview.errors.map((g, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[#E8E8F2]">
                    <span>❌</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-5 py-2 text-sm text-[#E8E8F2] hover:text-white"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={preview.errors.length > 0}
              title={
                preview.errors.length > 0
                  ? 'Fix the errors in your template first'
                  : undefined
              }
              className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Confirm &amp; Import →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — confirm + import */}
      {step === 3 && preview && (
        <div className="space-y-6">
          {done ? (
            <SuccessScreen preview={preview} onReset={handleReset} />
          ) : (
            <>
              <section className={cardClass}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Confirm &amp; Import
                </h3>
                <p className="mt-2 text-sm text-[#B0B0C8]">
                  This will create the following records in Domio:
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    ['Portfolios', preview.portfolios],
                    ['Properties', preview.properties],
                    ['Units', preview.units],
                    ['Tenants', preview.tenants],
                    ['Rent records', preview.rentRecords],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="rounded-xl border border-[#312D58] bg-[rgba(255,255,255,0.04)] p-3"
                    >
                      <p className="text-lg font-semibold text-white">
                        {value}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {importing && (
                <div className={cardClass}>
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-200 border-t-[#18181b]" />
                    <p className="text-sm font-medium text-white">
                      {STATUS_MESSAGES[statusIndex]}
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#312D58]">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-zinc-900" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={importing}
                  className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-5 py-2 text-sm text-[#E8E8F2] hover:text-white disabled:opacity-50"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={confirmImport}
                  disabled={importing}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {importing && (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {importing ? 'Importing…' : 'Confirm & Import'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── sub-components ─────────────────────────

function Stepper({ step }: { step: number }) {
  const steps = ['Upload Template', 'Preview Data', 'Confirm & Import'];
  return (
    <div className="mb-8 flex items-center gap-2">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const complete = n < step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                  (complete
                    ? 'bg-[#22c55e] text-white'
                    : active
                      ? 'bg-zinc-900 text-white shadow-[0_0_16px_rgba(91,79,232,0.5)]'
                      : 'border border-[#312D58] bg-[rgba(255,255,255,0.06)] text-[#6A6A8A]')
                }
              >
                {complete ? '✓' : n}
              </span>
              <span
                className={
                  'hidden text-xs font-medium sm:inline ' +
                  (active ? 'text-white' : 'text-[#6A6A8A]')
                }
              >
                {label}
              </span>
            </div>
            {n < steps.length && (
              <div
                className={
                  'h-px flex-1 ' + (complete ? 'bg-[#22c55e]' : 'bg-[#312D58]')
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center gap-2">
      <span>✅</span>
      <span className="text-[#E8E8F2]">
        <span className="font-semibold text-white">{value}</span> {label}
      </span>
    </li>
  );
}

function SuccessScreen({
  preview,
  onReset,
}: {
  preview: Preview;
  onReset: () => void;
}) {
  return (
    <div className={cardClass}>
      <div className="flex flex-col items-center py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e]/15 text-3xl">
          ✅
        </div>
        <h2 className="mt-4 text-lg font-semibold text-white">
          Import complete
        </h2>
        <p className="mt-1 text-sm text-[#B0B0C8]">
          Your template data is now in Domio.
        </p>

        <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ['Portfolios', preview.portfolios],
            ['Properties', preview.properties],
            ['Units', preview.units],
            ['Tenants', preview.tenants],
            ['Rent', preview.rentRecords],
          ].map(([label, value]) => (
            <div
              key={label as string}
              className="rounded-xl border border-[#312D58] bg-[rgba(255,255,255,0.04)] p-3"
            >
              <p className="text-lg font-semibold text-white">{value}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard/portfolios"
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
          >
            View Portfolios
          </Link>
          <Link
            href="/dashboard/import/history"
            className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-5 py-2 text-sm font-medium text-[#E8E8F2] hover:text-white"
          >
            Import History
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="rounded-full border border-zinc-300 bg-[rgba(255,255,255,0.06)] px-5 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-900/10"
          >
            Start New Import
          </button>
        </div>
      </div>
    </div>
  );
}
