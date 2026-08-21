'use client';

import { useEffect, useRef, useState } from 'react';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import type { DocumentType, EntityType } from '@prisma/client';
import type { OwnerStructure } from '@/lib/expenses';
import {
  DOCUMENT_TYPES,
  ENTITY_TYPES,
  ACCEPTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE,
  formatFileSize,
  isValidMimeType,
} from '@/lib/document-types';

const inputClass =
  'w-full rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

type TenantOption = { id: string; name: string };

export default function UploadDocumentModal({
  open,
  onClose,
  onSuccess,
  structure,
  tenants,
  defaultEntityType,
  defaultEntityId,
  lockedEntityLabel,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  structure?: OwnerStructure;
  tenants?: TenantOption[];
  defaultEntityType?: EntityType;
  defaultEntityId?: string;
  // When set, the link target is fixed (e.g. from a unit detail page).
  lockedEntityLabel?: string;
}) {
  const struct = structure ?? [];
  const tenantList = tenants ?? [];
  const locked = !!defaultEntityType && !!defaultEntityId;

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('OTHER');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [linkType, setLinkType] = useState<EntityType>(
    defaultEntityType ?? 'PORTFOLIO',
  );
  const [portfolioId, setPortfolioId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [tenantId, setTenantId] = useState('');

  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset all form state each time the modal opens (it stays mounted while
  // closed, so otherwise the previous upload's values linger).
  useEffect(() => {
    if (open) {
      setFile(null);
      setName('');
      setDocumentType('OTHER');
      setDescription('');
      setExpiryDate('');
      setLinkType(defaultEntityType ?? 'PORTFOLIO');
      setPortfolioId('');
      setPropertyId('');
      setUnitId('');
      setTenantId('');
      setDragging(false);
      setUploading(false);
      setProgress(0);
      setError(null);
    }
  }, [open, defaultEntityType]);

  // Lock body scroll + close on Escape while open.
  useScrollLock(open);
  const trapRef = useFocusTrap<HTMLFormElement>(open);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !uploading) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, uploading, onClose]);

  if (!open) return null;

  const selectedPortfolio = struct.find((p) => p.id === portfolioId);
  const selectedProperty = selectedPortfolio?.properties.find(
    (pr) => pr.id === propertyId,
  );

  function pickFile(f: File | null) {
    setError(null);
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setError('File exceeds the 10MB limit.');
      return;
    }
    if (f.type && !isValidMimeType(f.type)) {
      setError('Unsupported file type. Use PDF, image, Word, Excel, or text.');
      return;
    }
    setFile(f);
    if (!name.trim()) {
      // Auto-fill name from filename (without extension).
      setName(f.name.replace(/\.[^.]+$/, ''));
    }
  }

  function resolveEntityId(): string {
    if (locked) return defaultEntityId as string;
    switch (linkType) {
      case 'PORTFOLIO':
        return portfolioId;
      case 'PROPERTY':
        return propertyId;
      case 'SUB_PROPERTY':
        return unitId;
      case 'TENANT':
        return tenantId;
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!file) {
      setError('Please choose a file.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter a document name.');
      return;
    }
    const entityType = locked ? (defaultEntityType as EntityType) : linkType;
    const entityId = resolveEntityId();
    if (!entityId) {
      setError('Please choose what to link this document to.');
      return;
    }

    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name.trim());
    fd.append('documentType', documentType);
    fd.append('description', description);
    fd.append('entityType', entityType);
    fd.append('entityId', entityId);
    if (expiryDate) fd.append('expiryDate', expiryDate);

    setUploading(true);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/documents');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        onSuccess();
        onClose();
      } else {
        let msg = 'Upload failed. Please try again.';
        try {
          msg = JSON.parse(xhr.responseText)?.error ?? msg;
        } catch {
          /* ignore */
        }
        setError(msg);
      }
    };
    xhr.onerror = () => {
      setUploading(false);
      setError('Network error during upload.');
    };
    xhr.send(fd);
  }

  const radioBtn = (active: boolean) =>
    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors ' +
    (active
      ? 'border border-zinc-300 bg-zinc-900 text-white'
      : 'border border-[#312D58] bg-[rgba(255,255,255,0.04)] text-[#B0B0C8] hover:text-white');

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => !uploading && onClose()}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
    >
      <form
        ref={trapRef}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.95)] p-6 shadow-2xl backdrop-blur-xl"
      >
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Upload Document
        </h2>

        {/* Drag & drop zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
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
            'mt-4 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ' +
            (dragging
              ? 'border-zinc-200 bg-zinc-50'
              : 'border-zinc-200 hover:border-zinc-200')
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_EXTENSIONS}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="text-2xl">📄</span>
              <div className="text-left">
                <p className="font-medium text-white">{file.name}</p>
                <p className="text-xs text-[#6A6A8A]">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="ml-2 rounded-full px-2 text-[#B0B0C8] hover:text-white"
              >
                ✕
              </button>
            </div>
          ) : (
            <>
              <div className="text-3xl">📤</div>
              <p className="mt-2 text-sm text-[#E8E8F2]">
                Drag &amp; drop or click to browse
              </p>
              <p className="mt-1 text-xs text-[#6A6A8A]">
                PDF, images, Word, Excel, txt · max 10MB
              </p>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="doc-name" className={labelClass}>
              Document Name
            </label>
            <input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. 2026 Lease Agreement"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="doc-type" className={labelClass}>
              Document Type
            </label>
            <select
              id="doc-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className={inputClass}
            >
              {DOCUMENT_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.icon} {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="doc-desc" className={labelClass}>
              Description <span className="text-[#B0B0C8]">(optional)</span>
            </label>
            <textarea
              id="doc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={inputClass + ' resize-y'}
            />
          </div>

          {/* Link to */}
          {locked ? (
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Linked To</span>
              <div className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-zinc-500">
                {lockedEntityLabel ?? 'This item'}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className={labelClass}>Link To</span>
              <div className="flex flex-wrap gap-2">
                {ENTITY_TYPES.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setLinkType(e.value as EntityType)}
                    className={radioBtn(linkType === e.value)}
                  >
                    {e.label}
                  </button>
                ))}
              </div>

              {/* Portfolio selector (PORTFOLIO / PROPERTY / SUB_PROPERTY) */}
              {linkType !== 'TENANT' && (
                <select
                  value={portfolioId}
                  onChange={(e) => {
                    setPortfolioId(e.target.value);
                    setPropertyId('');
                    setUnitId('');
                  }}
                  className={inputClass}
                >
                  <option value="">Select portfolio…</option>
                  {struct.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              {(linkType === 'PROPERTY' || linkType === 'SUB_PROPERTY') &&
                selectedPortfolio && (
                  <select
                    value={propertyId}
                    onChange={(e) => {
                      setPropertyId(e.target.value);
                      setUnitId('');
                    }}
                    className={inputClass}
                  >
                    <option value="">Select property…</option>
                    {selectedPortfolio.properties.map((pr) => (
                      <option key={pr.id} value={pr.id}>
                        {pr.name}
                      </option>
                    ))}
                  </select>
                )}
              {linkType === 'SUB_PROPERTY' && selectedProperty && (
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select unit…</option>
                  {selectedProperty.units.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unitNumber} — {u.name}
                    </option>
                  ))}
                </select>
              )}
              {linkType === 'TENANT' && (
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select tenant…</option>
                  {tenantList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="doc-expiry" className={labelClass}>
              Expiry Date <span className="text-[#B0B0C8]">(optional)</span>
            </label>
            <input
              id="doc-expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-[#6A6A8A]">e.g. insurance renewal date</p>
          </div>
        </div>

        {uploading && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#1A1A2A]">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs text-[#6A6A8A]">
              Uploading… {progress}%
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => !uploading && onClose()}
            disabled={uploading}
            className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  );
}
