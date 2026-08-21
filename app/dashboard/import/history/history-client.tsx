'use client';

import { useState } from 'react';
import type { ImportStatus, ImportType } from '@prisma/client';
import {
  IMPORT_STATUS_META,
  importTypeLabel,
  canRollback,
} from '@/lib/import/import-types';

type JobRow = {
  id: string;
  displayId: string | null;
  importType: ImportType;
  status: ImportStatus;
  originalFileName: string;
  recordsCreated: number;
  confirmedAt: string | null;
  rolledBackAt: string | null;
  createdAt: string;
};

const toneClass: Record<string, string> = {
  violet: 'border-zinc-700/30 bg-zinc-900/15 text-zinc-500',
  gold: 'border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.12)] text-[#E8A020]',
  green: 'border-green-500/30 bg-green-500/10 text-green-400',
  red: 'border-red-500/30 bg-red-500/10 text-red-400',
  muted: 'border-[#312D58] bg-[rgba(255,255,255,0.06)] text-[#B0B0C8]',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function HistoryClient({
  initialJobs,
}: {
  initialJobs: JobRow[];
}) {
  const [jobs, setJobs] = useState(initialJobs);
  const [target, setTarget] = useState<JobRow | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doRollback() {
    if (!target) return;
    setRollingBack(true);
    setError(null);
    try {
      const res = await fetch(`/api/imports/${target.id}/rollback`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rollback failed.');
      setJobs((prev) =>
        prev.map((j) =>
          j.id === target.id
            ? {
                ...j,
                status: 'ROLLED_BACK',
                rolledBackAt: new Date().toISOString(),
                recordsCreated: 0,
              }
            : j,
        ),
      );
      setTarget(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rollback failed.');
    } finally {
      setRollingBack(false);
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-[#312D58] bg-[rgba(23,21,47,0.6)] p-10 text-center">
        <div className="text-3xl">📥</div>
        <p className="mt-3 text-sm text-[#B0B0C8]">
          No imports yet. Run your first one from the New Import button.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#312D58]">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">File</th>
              <th className="hidden px-4 py-3 sm:table-cell">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden px-4 py-3 text-right md:table-cell">
                Records
              </th>
              <th className="hidden px-4 py-3 sm:table-cell">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const meta = IMPORT_STATUS_META[j.status];
              return (
                <tr key={j.id} className="border-t border-[#312D58]">
                  <td className="px-4 py-3 font-mono text-xs text-[#B0B0C8]">
                    {j.displayId ?? '—'}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-[#E8E8F2]">
                    {j.originalFileName}
                  </td>
                  <td className="hidden px-4 py-3 text-[#B0B0C8] sm:table-cell">
                    {importTypeLabel(j.importType)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass[meta.tone]}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-[#E8E8F2] md:table-cell">
                    {j.recordsCreated}
                  </td>
                  <td className="hidden px-4 py-3 text-[#B0B0C8] sm:table-cell">
                    {fmtDate(j.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canRollback(j) ? (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setTarget(j);
                        }}
                        className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                      >
                        Rollback
                      </button>
                    ) : (
                      <span className="text-xs text-[#4A4A6A]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && !target && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !rollingBack && setTarget(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-[rgba(14,12,34,0.95)] p-6 shadow-2xl backdrop-blur-xl"
          >
            <h2 className="text-lg font-semibold text-white">Roll back import?</h2>
            <p className="mt-2 text-sm text-[#B0B0C8]">
              This will permanently delete the{' '}
              <span className="font-semibold text-white">
                {target.recordsCreated}
              </span>{' '}
              records created by{' '}
              <span className="font-mono text-xs text-[#E8E8F2]">
                {target.displayId ?? target.originalFileName}
              </span>
              , including the property, units, tenants and rent ledger entries.
              This cannot be undone.
            </p>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !rollingBack && setTarget(null)}
                disabled={rollingBack}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doRollback}
                disabled={rollingBack}
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                {rollingBack && (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                )}
                {rollingBack ? 'Rolling back…' : 'Yes, roll back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
