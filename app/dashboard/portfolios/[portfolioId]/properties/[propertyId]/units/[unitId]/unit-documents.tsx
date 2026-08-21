'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DocumentWithUrl } from '@/types/documents';
import {
  getDocumentTypeIcon,
  getDocumentTypeLabel,
  formatFileSize,
} from '@/lib/document-types';
import UploadDocumentModal from '@/components/documents/upload-document-modal';

const DAY = 86_400_000;
const dateFmt = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const sectionLabel =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B6FE8]';
const addBtn =
  'inline-flex min-h-[36px] items-center rounded-full border border-[#5B4FE8]/40 bg-[#5B4FE8]/15 px-3 py-1.5 text-xs font-medium text-[#8B6FE8] transition-colors hover:bg-[#5B4FE8]/25';

export default function UnitDocuments({
  documents,
  unitId,
  unitLabel,
}: {
  documents: DocumentWithUrl[];
  unitId: string;
  unitLabel: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(documents);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [target, setTarget] = useState<DocumentWithUrl | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setItems(documents), [documents]);

  const now = Date.now();

  function expiry(d: DocumentWithUrl) {
    if (!d.expiryDate) return <span className="text-[#4A4A6A]">—</span>;
    const n = Math.ceil((new Date(d.expiryDate).getTime() - now) / DAY);
    const label = dateFmt.format(new Date(d.expiryDate));
    if (n < 0) return <span className="text-[#ef4444]">Expired · {label}</span>;
    if (n <= 30) return <span className="text-[#E8A020]">{n}d · {label}</span>;
    return <span className="text-[#22c55e]">{label}</span>;
  }

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    const res = await fetch(`/api/documents/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== target.id));
      setTarget(null);
      router.refresh();
    }
    setDeleting(false);
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={sectionLabel}>Documents</p>
        <button type="button" onClick={() => setUploadOpen(true)} className={addBtn}>
          Upload Document
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[rgba(91,79,232,0.15)] px-3 py-8 text-center">
          <div className="text-2xl">📁</div>
          <p className="mt-2 text-sm text-[#6A6A8A]">
            No documents uploaded for this unit
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[rgba(91,79,232,0.15)]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[rgba(91,79,232,0.1)] text-xs uppercase tracking-wide text-[#8B6FE8]">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Expiry</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(91,79,232,0.1)]">
              {items.map((d) => (
                <tr
                  key={d.id}
                  className="transition-colors hover:bg-[rgba(91,79,232,0.05)]"
                >
                  <td className="px-3 py-2">
                    <a
                      href={d.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-white transition-colors hover:text-[#8B6FE8]"
                    >
                      {getDocumentTypeIcon(d.documentType)} {d.name}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-full border border-[#5B4FE8]/30 bg-[#5B4FE8]/15 px-2.5 py-0.5 text-xs font-medium text-[#8B6FE8]">
                      {getDocumentTypeLabel(d.documentType)}
                    </span>
                  </td>
                  <td className="px-3 py-2">{expiry(d)}</td>
                  <td className="px-3 py-2 text-[#6A6A8A]">
                    {formatFileSize(d.fileSize)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setTarget(d)}
                      className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      Delete
                    </button>
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
        defaultEntityType="SUB_PROPERTY"
        defaultEntityId={unitId}
        lockedEntityLabel={unitLabel}
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
              Delete “{target.name}”? This cannot be undone.
            </p>
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
    </>
  );
}
