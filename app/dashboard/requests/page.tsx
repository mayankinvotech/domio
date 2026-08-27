'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SendPrivacyRequestModal, { type TargetEntity } from '@/components/privacy-requests/send-request-modal';

type Request = {
  id: string;
  requestType: 'RENT_REQUEST' | 'OFFER_RENT' | 'HIRE_AGENT';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  createdAt: string;
  location: string;
  propertyType: string | null;
  propertyName: string | null;
  propertyId: string | null;
  proposedRentOrFee: number | null;
  message: string | null;
  // received-specific
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  senderLocation?: string;
  senderPhone?: string;
  senderEmail?: string;
  // sent-specific
  receiverId?: string;
  receiverName?: string;
  receiverRole?: string;
  receiverLocation?: string;
  receiverPhone?: string;
  receiverEmail?: string;
};

const REQUEST_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  RENT_REQUEST: { label: 'Take Rent (Renter Request)', icon: '🏠', color: 'bg-blue-100 text-blue-800' },
  OFFER_RENT: { label: 'Give Rent (Owner Offer)', icon: '🔑', color: 'bg-emerald-100 text-emerald-800' },
  HIRE_AGENT: { label: 'Hire Agent', icon: '💼', color: 'bg-amber-100 text-amber-800' },
};

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-emerald-100 text-emerald-800',
  DECLINED: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-zinc-100 text-zinc-600',
};

export default function RequestsInboxPage() {
  const [tab, setTab] = useState<'received' | 'sent'>('received');
  const [received, setReceived] = useState<Request[]>([]);
  const [sent, setSent] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTarget, setReplyTarget] = useState<TargetEntity | null>(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [actioning, setActioning] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/privacy-requests');
      if (res.ok) {
        const data = await res.json();
        setReceived(data.received ?? []);
        setSent(data.sent ?? []);
      }
    } catch {/* ignore */}
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  async function updateStatus(requestId: string, status: string) {
    setActioning(requestId);
    try {
      const res = await fetch(`/api/privacy-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) fetchData();
    } catch {/* ignore */}
    finally { setActioning(null); }
  }

  const pendingCount = received.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="min-h-full bg-[#fafaf9]">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-zinc-950 py-10 sm:py-14 text-white">
        <div
          className="absolute inset-0 opacity-20 mix-blend-luminosity"
          style={{
            backgroundImage: `radial-gradient(circle at 60% 40%, rgba(30,41,59,0.9), rgba(9,9,11,1))`,
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
                <span>🔒</span>
                <span>Privacy-Preserving Request System</span>
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">
                Requests Inbox
              </h1>
              <p className="mt-2 text-sm text-zinc-300 max-w-2xl">
                Securely exchange rental, lease, and agent-hire requests. Contact details stay hidden until you accept — protecting your privacy at every step.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {pendingCount > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-sm font-bold text-rose-200">
                  🔔 {pendingCount} Pending
                </div>
              )}
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black shadow-sm transition-all hover:bg-zinc-100"
              >
                🔍 Find Properties
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Received</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">{received.length}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Pending</p>
              <p className="mt-1 font-mono text-2xl font-bold text-amber-400">{pendingCount}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Accepted</p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">
                {received.filter((r) => r.status === 'ACCEPTED').length}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Sent</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">{sent.length}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Privacy Shield Card */}
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
          <span className="text-xl shrink-0">🛡️</span>
          <div>
            <p className="font-bold">Contact Privacy is Protected</p>
            <p className="text-xs mt-0.5 text-emerald-800">
              Phone numbers and emails are hidden (<span className="font-semibold">🔒 Hidden until accepted</span>) until you explicitly accept a request. Once accepted, both parties can see each other&apos;s contact info to proceed with rent or agent engagement.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 mb-6">
          <button
            type="button"
            onClick={() => setTab('received')}
            className={`pb-3 px-5 text-sm font-bold border-b-2 transition-all ${
              tab === 'received'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            Received ({received.length})
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {pendingCount} new
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('sent')}
            className={`pb-3 px-5 text-sm font-bold border-b-2 transition-all ${
              tab === 'sent'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            Sent ({sent.length})
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border border-zinc-200 bg-white" />
            ))}
          </div>
        ) : tab === 'received' ? (
          received.length === 0 ? (
            <EmptyState
              icon="📬"
              title="No requests received yet"
              description="When owners, tenants, or agents send you privacy requests, they will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {received.map((r) => (
                <ReceivedCard
                  key={r.id}
                  request={r}
                  actioning={actioning}
                  onAccept={() => updateStatus(r.id, 'ACCEPTED')}
                  onDecline={() => updateStatus(r.id, 'DECLINED')}
                  onReply={() => {
                    setReplyTarget({
                      receiverId: r.senderId!,
                      receiverName: r.senderName!,
                      receiverRole: (r.senderRole as 'OWNER' | 'AGENT' | 'TENANT') || 'OWNER',
                      location: r.senderLocation || r.location,
                      propertyId: r.propertyId || undefined,
                      propertyName: r.propertyName || undefined,
                      propertyType: r.propertyType || undefined,
                    });
                    setReplyModalOpen(true);
                  }}
                />
              ))}
            </div>
          )
        ) : (
          sent.length === 0 ? (
            <EmptyState
              icon="📤"
              title="No requests sent yet"
              description="Search for owners or agents using the search bar in the header and send them privacy-protected requests."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sent.map((r) => (
                <SentCard
                  key={r.id}
                  request={r}
                  actioning={actioning}
                  onCancel={() => updateStatus(r.id, 'CANCELLED')}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Reply Modal */}
      <SendPrivacyRequestModal
        target={replyTarget}
        isOpen={replyModalOpen}
        onClose={() => setReplyModalOpen(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}

function ReceivedCard({
  request: r,
  actioning,
  onAccept,
  onDecline,
  onReply,
}: {
  request: Request;
  actioning: string | null;
  onAccept: () => void;
  onDecline: () => void;
  onReply: () => void;
}) {
  const typeInfo = REQUEST_TYPE_LABELS[r.requestType] ?? { label: r.requestType, icon: '📄', color: 'bg-zinc-100 text-zinc-700' };
  const isAccepted = r.status === 'ACCEPTED';

  return (
    <div className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-xs transition-all ${r.status === 'PENDING' ? 'border-amber-300/60' : 'border-zinc-200'}`}>
      <div>
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${typeInfo.color}`}>
            {typeInfo.icon} {typeInfo.label}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGES[r.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {r.status}
          </span>
        </div>

        {/* Sender Info */}
        <div className="mt-3">
          <p className="text-base font-bold text-zinc-900">From: {r.senderName}</p>
          <p className="text-xs text-zinc-500">
            Role: <span className="font-semibold">{r.senderRole}</span>
            {r.senderLocation && <span> · 📍 {r.senderLocation}</span>}
          </p>
          {/* Contact — only shown when ACCEPTED */}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
            <span className={`font-mono ${isAccepted ? 'text-emerald-700 font-bold' : 'text-zinc-400'}`}>
              📞 {r.senderPhone}
            </span>
            <span className={`${isAccepted ? 'text-blue-700' : 'text-zinc-400'} truncate`}>
              ✉️ {r.senderEmail}
            </span>
          </div>
        </div>

        {/* Request Details */}
        <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 flex flex-col gap-1 border border-zinc-100">
          {r.location && <p><span className="font-bold">Location:</span> 📍 {r.location}</p>}
          {r.propertyName && <p><span className="font-bold">Property:</span> 🏠 {r.propertyName}</p>}
          {r.propertyType && <p><span className="font-bold">Type:</span> 🏷️ {r.propertyType}</p>}
          {r.proposedRentOrFee && (
            <p><span className="font-bold">Proposed Rent/Fee:</span> <span className="font-mono font-bold">${r.proposedRentOrFee.toLocaleString()}</span></p>
          )}
          {r.message && <p className="italic text-zinc-500 border-t border-zinc-200 pt-1 mt-1">&ldquo;{r.message}&rdquo;</p>}
        </div>

        <p className="mt-2 text-[10px] text-zinc-400 font-mono">
          Received {new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Actions */}
      {r.status === 'PENDING' && (
        <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onAccept}
            disabled={actioning === r.id}
            className="flex-1 rounded-xl bg-zinc-900 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-all"
          >
            ✓ Accept & Reveal Contact
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={actioning === r.id}
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 transition-all"
          >
            Decline
          </button>
        </div>
      )}
      {r.status === 'ACCEPTED' && (
        <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onReply}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 text-xs font-bold text-zinc-800 hover:bg-zinc-100 transition-all"
          >
            ↩ Send Reply Request
          </button>
        </div>
      )}
    </div>
  );
}

function SentCard({
  request: r,
  actioning,
  onCancel,
}: {
  request: Request;
  actioning: string | null;
  onCancel: () => void;
}) {
  const typeInfo = REQUEST_TYPE_LABELS[r.requestType] ?? { label: r.requestType, icon: '📄', color: 'bg-zinc-100 text-zinc-700' };
  const isAccepted = r.status === 'ACCEPTED';

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${typeInfo.color}`}>
            {typeInfo.icon} {typeInfo.label}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGES[r.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
            {r.status}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-base font-bold text-zinc-900">To: {r.receiverName}</p>
          <p className="text-xs text-zinc-500">
            Role: <span className="font-semibold">{r.receiverRole}</span>
            {r.receiverLocation && <span> · 📍 {r.receiverLocation}</span>}
          </p>
          {/* Revealed contact when accepted */}
          {isAccepted && (
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-mono font-bold text-emerald-700">📞 {r.receiverPhone}</span>
              <span className="text-blue-700">✉️ {r.receiverEmail}</span>
            </div>
          )}
          {!isAccepted && (
            <p className="mt-1.5 text-xs text-zinc-400 italic">
              🔒 Contact details hidden until recipient accepts
            </p>
          )}
        </div>

        <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs text-zinc-700 flex flex-col gap-1 border border-zinc-100">
          {r.location && <p><span className="font-bold">Location:</span> 📍 {r.location}</p>}
          {r.propertyName && <p><span className="font-bold">Property:</span> 🏠 {r.propertyName}</p>}
          {r.propertyType && <p><span className="font-bold">Type:</span> 🏷️ {r.propertyType}</p>}
          {r.proposedRentOrFee && (
            <p><span className="font-bold">Proposed:</span> <span className="font-mono font-bold">${r.proposedRentOrFee.toLocaleString()}</span></p>
          )}
          {r.message && <p className="italic text-zinc-500 border-t border-zinc-200 pt-1 mt-1">&ldquo;{r.message}&rdquo;</p>}
        </div>

        <p className="mt-2 text-[10px] text-zinc-400 font-mono">
          Sent {new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {r.status === 'PENDING' && (
        <div className="mt-4 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={actioning === r.id}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel Request
          </button>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-2xl">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-zinc-900">{title}</h3>
      <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-md mx-auto">{description}</p>
    </div>
  );
}
