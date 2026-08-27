'use client';

import { useState } from 'react';

export type TargetEntity = {
  receiverId: string;
  receiverName: string;
  receiverRole: 'OWNER' | 'AGENT' | 'TENANT';
  location: string;
  propertyId?: string;
  propertyName?: string;
  propertyType?: string;
  defaultRequestType?: 'RENT_REQUEST' | 'OFFER_RENT' | 'HIRE_AGENT';
};

export default function SendPrivacyRequestModal({
  target,
  isOpen,
  onClose,
  onSuccess,
}: {
  target: TargetEntity | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [requestType, setRequestType] = useState<'RENT_REQUEST' | 'OFFER_RENT' | 'HIRE_AGENT'>(
    target?.defaultRequestType || 'RENT_REQUEST',
  );
  const [propertyType, setPropertyType] = useState(target?.propertyType || '');
  const [proposedRentOrFee, setProposedRentOrFee] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !target) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/privacy-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: target.receiverId,
          receiverRole: target.receiverRole,
          receiverName: target.receiverName,
          requestType,
          propertyId: target.propertyId || null,
          propertyName: target.propertyName || null,
          location: target.location,
          propertyType: propertyType || target.propertyType || null,
          proposedRentOrFee: proposedRentOrFee ? Number(proposedRentOrFee) : null,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send request');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full bg-zinc-100 p-1.5 text-zinc-400 hover:text-zinc-700"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-xl text-white">
            🔒
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900">
              Send Privacy Protected Request
            </h3>
            <p className="text-xs text-zinc-500">
              To: <span className="font-semibold text-zinc-800">{target.receiverName}</span> ({target.receiverRole}) · 📍 {target.location}
            </p>
          </div>
        </div>

        {/* Privacy Shield Notice */}
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 flex items-start gap-2">
          <span className="text-sm">🛡️</span>
          <div>
            <span className="font-bold">Privacy Shield Active:</span> Your phone number and email are kept confidential and will only be revealed once {target.receiverName} accepts your request.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          {/* Request Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
              Request Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRequestType('RENT_REQUEST')}
                className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                  requestType === 'RENT_REQUEST'
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                🏠 Take Rent
              </button>
              <button
                type="button"
                onClick={() => setRequestType('OFFER_RENT')}
                className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                  requestType === 'OFFER_RENT'
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                🔑 Give Rent
              </button>
              <button
                type="button"
                onClick={() => setRequestType('HIRE_AGENT')}
                className={`rounded-xl border p-2 text-xs font-bold transition-all ${
                  requestType === 'HIRE_AGENT'
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                💼 Hire Agent
              </button>
            </div>
          </div>

          {/* Property Details (if applicable) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                Property / Space Type
              </label>
              <input
                type="text"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                placeholder="e.g. Flat, Land, Hospital, Hotel, Office"
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
                Proposed Rent / Budget ($)
              </label>
              <input
                type="number"
                value={proposedRentOrFee}
                onChange={(e) => setProposedRentOrFee(e.target.value)}
                placeholder="e.g. 1800"
                className={inputClass}
              />
            </div>
          </div>

          {/* Message */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700">
              Message / Notes <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide context on your property requirement, move-in timeline, or agency needs..."
              className={inputClass}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-600">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-700">
              ✓ Request sent securely! The recipient has been notified.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-2xl bg-zinc-900 py-3 text-xs font-bold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? 'Sending Request…' : 'Send Privacy Request →'}
          </button>
        </form>
      </div>
    </div>
  );
}
