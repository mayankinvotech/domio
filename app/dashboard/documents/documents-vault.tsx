'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DocumentType, EntityType } from '@prisma/client';
import type { OwnerStructure } from '@/lib/expenses';
import type { DocumentWithUrl } from '@/types/documents';
import {
  DOCUMENT_TYPES,
  getDocumentTypeIcon,
  getDocumentTypeLabel,
  getEntityTypeIcon,
  formatFileSize,
} from '@/lib/document-types';
import UploadDocumentModal from '@/components/documents/upload-document-modal';

const DAY = 86_400_000;
const dateFmt = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const glassCard =
  'rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] p-5 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]';

type EntityFilter = 'ALL' | EntityType;

const ENTITY_FILTERS: { value: EntityFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PORTFOLIO', label: 'Portfolio' },
  { value: 'PROPERTY', label: 'Property' },
  { value: 'SUB_PROPERTY', label: 'Unit' },
  { value: 'TENANT', label: 'Tenant' },
];

function daysUntil(d: Date, now: number): number {
  return Math.ceil((new Date(d).getTime() - now) / DAY);
}

export default function DocumentsVault({
  documents,
  structure,
  tenants,
  canManage = true,
}: {
  documents: DocumentWithUrl[];
  structure: OwnerStructure;
  tenants: { id: string; name: string }[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(documents);
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | DocumentType>('ALL');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [target, setTarget] = useState<DocumentWithUrl | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  // Signed URLs were minted server-side at this fetch time; they expire in 15m.
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());

  useEffect(() => {
    setItems(documents);
    setFetchedAt(Date.now());
  }, [documents]);

  // Open a document, fetching a fresh signed URL first if the cached one is
  // close to its 15-minute expiry.
  async function handleDownload(d: DocumentWithUrl) {
    const ageMinutes = (Date.now() - fetchedAt) / 1000 / 60;
    if (ageMinutes > 14) {
      try {
        const res = await fetch(`/api/documents/${d.id}/download`);
        if (res.ok) {
          const { url } = await res.json();
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }
      } catch {
        /* fall back to the cached URL below */
      }
    }
    window.open(d.signedUrl, '_blank', 'noopener,noreferrer');
  }

  const now = Date.now();
  const expiringSoon = items.filter((d) => {
    if (!d.expiryDate) return false;
    const n = daysUntil(d.expiryDate, now);
    return n >= 0 && n <= 30;
  });
  const expired = items.filter(
    (d) => d.expiryDate && daysUntil(d.expiryDate, now) < 0,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) => {
      if (entityFilter !== 'ALL' && d.entityType !== entityFilter) return false;
      if (typeFilter !== 'ALL' && d.documentType !== typeFilter) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, entityFilter, typeFilter, search]);

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    setDelError(null);
    const res = await fetch(`/api/documents/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== target.id));
      setTarget(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setDelError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setDeleting(false);
  }

  function ExpiryCell({ d }: { d: DocumentWithUrl }) {
    if (!d.expiryDate) return <span className="text-[#4A4A6A]">—</span>;
    const n = daysUntil(d.expiryDate, now);
    const label = dateFmt.format(new Date(d.expiryDate));
    if (n < 0) return <span className="text-[#ef4444]">Expired · {label}</span>;
    if (n <= 30) return <span className="text-[#E8A020]">{n}d · {label}</span>;
    return <span className="text-[#22c55e]">{label}</span>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Documents
          </h1>
          {!canManage && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-2.5 py-0.5 text-xs font-medium text-[#B0B0C8]">
              👁 View only
            </span>
          )}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-full border border-zinc-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
          >
            Upload Document
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={glassCard}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Total Documents
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{items.length}</p>
        </div>
        <div className={glassCard}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Expiring Soon
          </p>
          <p className="mt-2 text-2xl font-bold text-[#E8A020]">
            {expiringSoon.length}
          </p>
        </div>
        <div className={glassCard}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            Expired
          </p>
          <p className="mt-2 text-2xl font-bold text-[#ef4444]">
            {expired.length}
          </p>
        </div>
      </div>

      {/* Expiry warning banner */}
      {expiringSoon.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[rgba(232,160,32,0.3)] bg-[rgba(232,160,32,0.1)] px-5 py-4">
          <p className="text-sm font-medium text-[#E8A020]">
            ⚠️ {expiringSoon.length} document
            {expiringSoon.length === 1 ? '' : 's'} expiring within 30 days
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[#E8E8F2]">
            {expiringSoon.slice(0, 5).map((d) => (
              <li key={d.id}>
                {d.name}
                {d.entityLabel && (
                  <span className="text-[#6A6A8A]"> · {d.entityLabel}</span>
                )}
                <span className="text-[#E8A020]">
                  {' '}
                  · expires in {daysUntil(d.expiryDate as Date, now)} days
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ENTITY_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setEntityFilter(f.value)}
              className={
                'rounded-full px-3 py-1.5 text-xs font-medium transition-colors ' +
                (entityFilter === f.value
                  ? 'border border-zinc-300 bg-zinc-900 text-white'
                  : 'border border-[#312D58] bg-[rgba(255,255,255,0.04)] text-[#B0B0C8] hover:text-white')
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'ALL' | DocumentType)
            }
            className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none focus:border-zinc-700"
          >
            <option value="ALL">All Types</option>
            {DOCUMENT_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full max-w-xs rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20"
          />
        </div>
      </div>

      {/* Table / empty state */}
      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
          <div className="text-5xl">📁</div>
          <p className="mt-4 text-lg font-semibold text-white">
            No documents uploaded yet
          </p>
          {canManage && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="mt-5 inline-flex rounded-full border border-zinc-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Upload Document
          </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[#6A6A8A]">
          No documents match your filters.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Doc ID</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Linked To</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Expiry</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="transition-colors hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDownload(d)}
                      className="text-left font-medium text-white transition-colors hover:text-zinc-500"
                    >
                      {getDocumentTypeIcon(d.documentType)} {d.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#4A4A6A]">
                    {d.displayId ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-zinc-700/30 bg-zinc-900/15 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                      {getDocumentTypeLabel(d.documentType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6A6A8A]">
                    {d.entityLabel ? (
                      <span>
                        <span aria-hidden>{getEntityTypeIcon(d.entityType)}</span>{' '}
                        {d.entityLabel}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#6A6A8A]">
                    {formatFileSize(d.fileSize)}
                  </td>
                  <td className="px-4 py-3 text-[#6A6A8A]">
                    {dateFmt.format(new Date(d.createdAt))}
                  </td>
                  <td className="px-4 py-3">
                    <ExpiryCell d={d} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(d)}
                        className="rounded-full border border-[#71717a]/40 bg-zinc-900/15 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-900/25"
                      >
                        Download
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setDelError(null);
                            setTarget(d);
                          }}
                          className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadDocumentModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => router.refresh()}
        structure={structure}
        tenants={tenants}
      />

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !deleting && setTarget(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Delete document
            </h2>
            <p className="mt-2 text-sm text-[#E8E8F2]">
              Delete “{target.name}”? This removes the file from storage and
              cannot be undone.
            </p>
            {delError && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {delError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !deleting && setTarget(null)}
                disabled={deleting}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
