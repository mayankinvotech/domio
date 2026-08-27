'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PropertyType, PropertyStatus } from '@prisma/client';
import { PROPERTY_TYPES, PROPERTY_STATUSES } from '@/lib/property-types';

type Initial = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  type: PropertyType;
  customType?: string | null;
  status: PropertyStatus;
  listingStatus?: string;
  images?: string[];
  notes: string | null;
};

const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-zinc-700';

const SUGGESTED_TYPES = [
  'Flat',
  'Land',
  'Hospital',
  'Hotel',
  'Villa',
  'Shop / Retail',
  'Commercial Office',
  'Warehouse',
  'Farmhouse',
];

export default function PropertyForm({
  mode,
  portfolioId,
  property,
}: {
  mode: 'create' | 'edit';
  portfolioId: string;
  property?: Initial;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [customType, setCustomType] = useState(property?.customType ?? '');
  const [images, setImages] = useState<string[]>(property?.images ?? []);
  const [listingStatus, setListingStatus] = useState<string>(
    property?.listingStatus ?? 'Available now',
  );
  const [uploadingImage, setUploadingImage] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const listHref = `/dashboard/portfolios/${portfolioId}/properties`;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 5) {
      setError('You can upload a maximum of 5 images per property.');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        if (images.length >= 5) break;
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload/property-image', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setImages((prev) => (prev.length < 5 ? [...prev, data.url] : prev));
          }
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to upload photo.');
        }
      }
    } catch {
      setError('Error uploading images.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }

  function handleAddImageUrl() {
    if (!urlInput.trim()) return;
    if (images.length >= 5) {
      setError('Maximum 5 images allowed.');
      return;
    }
    setImages((prev) => [...prev, urlInput.trim()]);
    setUrlInput('');
  }

  function handleRemoveImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: data.get('name'),
      address: data.get('address'),
      city: data.get('city'),
      country: data.get('country'),
      type: data.get('type'),
      customType: customType.trim() || data.get('customType'),
      status: data.get('status'),
      listingStatus,
      images: images.slice(0, 5),
      notes: data.get('notes'),
      portfolioId,
    };

    const res = await fetch(
      mode === 'edit' ? `/api/properties/${property!.id}` : '/api/properties',
      {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (res.ok) {
      router.push(listHref);
      router.refresh();
      return;
    }

    const json = await res.json().catch(() => null);
    setError(json?.error ?? 'Something went wrong. Please try again.');
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          Property Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Metro Heights, Apollo Clinic Building, Sunset Plot"
          defaultValue={property?.name ?? ''}
          className={inputClass}
        />
      </div>

      {/* Manual Property Type Input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="customType" className={labelClass}>
          Property Type <span className="text-zinc-500 font-normal">(type manually or click suggestion)</span>
        </label>
        <input
          id="customType"
          name="customType"
          type="text"
          value={customType}
          onChange={(e) => setCustomType(e.target.value)}
          placeholder="e.g. Land, Hospital, Hotel, Flat, Villa, Shop, Warehouse"
          className={inputClass}
        />
        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SUGGESTED_TYPES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setCustomType(st)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                customType.toLowerCase() === st.toLowerCase()
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-zinc-100/70 text-zinc-700 hover:bg-zinc-200 hover:text-black'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="address" className={labelClass}>
          Address
        </label>
        <input
          id="address"
          name="address"
          type="text"
          required
          placeholder="e.g. 123 Main Street"
          defaultValue={property?.address ?? ''}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className={labelClass}>
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            required
            placeholder="e.g. New York"
            defaultValue={property?.city ?? ''}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country" className={labelClass}>
            Country
          </label>
          <input
            id="country"
            name="country"
            type="text"
            required
            placeholder="e.g. USA"
            defaultValue={property?.country ?? ''}
            className={inputClass}
          />
        </div>
      </div>

      {/* ── Photo Upload Gallery (Up to 5 Photos) ────────────────────────── */}
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-zinc-50/60 p-4">
        <div className="flex items-center justify-between">
          <label className={labelClass}>
            Property Photos <span className="text-zinc-500 font-normal">({images.length}/5 Photos)</span>
          </label>
          <span className="text-[11px] font-semibold text-zinc-500">
            JPG, PNG, WEBP · Max 5MB each
          </span>
        </div>

        {/* Upload Zone & File Input */}
        {images.length < 5 && (
          <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-white p-5 text-center transition-colors hover:border-zinc-500">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleFileUpload}
              disabled={uploadingImage}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-lg">
              {uploadingImage ? '⏳' : '📷'}
            </div>
            <p className="mt-2 text-xs font-bold text-zinc-800">
              {uploadingImage ? 'Uploading Photos…' : 'Click or Drag & Drop to Upload Photos'}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              Upload up to 5 high-resolution property pictures for the search carousel
            </p>
          </div>
        )}

        {/* Live Photo Thumbnails */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
            {images.map((imgUrl, idx) => (
              <div key={idx} className="group relative h-24 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-xs">
                <img
                  src={imgUrl}
                  alt={`Photo ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white opacity-90 hover:opacity-100 shadow"
                  title="Remove Photo"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Or Paste Image URL */}
        {images.length < 5 && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Or paste external photo image URL..."
              className={inputClass + ' text-xs py-1.5'}
            />
            <button
              type="button"
              onClick={handleAddImageUrl}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100 shrink-0"
            >
              + Add URL
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className={labelClass}>
            Category
          </label>
          <select
            id="type"
            name="type"
            required
            defaultValue={property?.type ?? 'RESIDENTIAL'}
            className={inputClass}
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="listingStatus" className={labelClass}>
            Listing Badge
          </label>
          <select
            id="listingStatus"
            value={listingStatus}
            onChange={(e) => setListingStatus(e.target.value)}
            className={inputClass}
          >
            <option value="Available now">Available now</option>
            <option value="Let">Let (Occupied)</option>
            <option value="Under Offer">Under Offer</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className={labelClass}>
            Property Status
          </label>
          <select
            id="status"
            name="status"
            required
            defaultValue={property?.status ?? 'ACTIVE'}
            className={inputClass}
          >
            {PROPERTY_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={labelClass}>
          Notes <span className="text-zinc-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={property?.notes ?? ''}
          placeholder="Add any additional information about this property..."
          className={inputClass + ' resize-y'}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-xs transition-all hover:bg-zinc-800 disabled:opacity-60"
      >
        {pending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Property'}
      </button>
    </form>
  );
}
