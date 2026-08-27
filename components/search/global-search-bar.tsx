'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SendPrivacyRequestModal, { type TargetEntity } from '@/components/privacy-requests/send-request-modal';

type SearchResult = {
  id: string;
  userId: string;
  name: string;
  agencyName?: string | null;
  location: string;
  skills?: string[];
  commissionRate?: string;
  rating?: number;
  reviewCount?: number;
  // Owner-specific
  propertyName?: string;
  propertyId?: string;
  propertyType?: string;
  address?: string;
};

type SearchResults = {
  agents: SearchResult[];
  owners: SearchResult[];
};

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<TargetEntity | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search/owners-and-agents?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setOpen(true);
        }
      } catch {/* ignore */} finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function openSendRequest(target: TargetEntity) {
    setRequestTarget(target);
    setRequestModalOpen(true);
    setOpen(false);
  }

  const totalResults = (results?.agents.length ?? 0) + (results?.owners.length ?? 0);

  return (
    <>
      <div ref={wrapperRef} className="relative w-full max-w-xs sm:max-w-sm">
        {/* Search Input */}
        <div
          className={`flex items-center gap-2 rounded-full border transition-all px-3 py-2 text-sm ${
            open
              ? 'border-zinc-900 bg-white shadow-lg'
              : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
          }`}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent shrink-0" />
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="shrink-0 text-zinc-400"
              aria-hidden
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results && setOpen(true)}
            placeholder="Search owners or agents by location…"
            className="w-full bg-transparent text-xs text-zinc-800 placeholder-zinc-400 outline-none"
            aria-label="Search owners and agents by location"
            id="global-location-search"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults(null); setOpen(false); }}
              className="text-zinc-400 hover:text-zinc-600 shrink-0 text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdown Results */}
        {open && results && (
          <div className="absolute right-0 top-full mt-2 w-[360px] rounded-2xl border border-zinc-200 bg-white shadow-2xl z-50 overflow-hidden max-h-[480px] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-zinc-100 px-4 py-2.5 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                {totalResults === 0 ? 'No results found' : `${totalResults} Result${totalResults !== 1 ? 's' : ''}`}
              </p>
              {totalResults > 0 && (
                <span className="text-[10px] text-zinc-400">
                  📍 &ldquo;{query}&rdquo;
                </span>
              )}
            </div>

            {totalResults === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-zinc-500">
                  No owners or agents found in &ldquo;{query}&rdquo;. Try a different city or location.
                </p>
              </div>
            ) : (
              <>
                {/* Agents Section */}
                {results.agents.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        💼 Agents &amp; Brokers ({results.agents.length})
                      </p>
                    </div>
                    {results.agents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-start justify-between gap-3 border-b border-zinc-50 px-4 py-3 hover:bg-zinc-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-bold text-zinc-900 truncate">{agent.name}</p>
                            {agent.agencyName && (
                              <span className="text-[10px] text-zinc-500">· {agent.agencyName}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">📍 {agent.location}</p>
                          {agent.skills && agent.skills.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {agent.skills.slice(0, 2).map((s) => (
                                <span
                                  key={s}
                                  className="rounded-full border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-600"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                          {agent.commissionRate && (
                            <p className="text-[10px] text-amber-700 font-semibold mt-1">
                              🏷️ {agent.commissionRate}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            openSendRequest({
                              receiverId: agent.userId,
                              receiverName: agent.name,
                              receiverRole: 'AGENT',
                              location: agent.location,
                              defaultRequestType: 'HIRE_AGENT',
                            })
                          }
                          className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-white transition-all hover:bg-zinc-800 whitespace-nowrap"
                        >
                          Send Request
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Owners / Properties Section */}
                {results.owners.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        🏢 Property Owners ({results.owners.length})
                      </p>
                    </div>
                    {results.owners.map((owner, i) => (
                      <div
                        key={`${owner.id}-${i}`}
                        className="flex items-start justify-between gap-3 border-b border-zinc-50 px-4 py-3 hover:bg-zinc-50 transition-colors last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-900 truncate">{owner.name}</p>
                          <p className="text-[11px] text-zinc-500 mt-0.5">📍 {owner.location}</p>
                          {owner.propertyName && (
                            <p className="text-[10px] text-zinc-600 font-semibold mt-0.5">
                              🏠 {owner.propertyName}
                              {owner.propertyType ? ` · 🏷️ ${owner.propertyType}` : ''}
                            </p>
                          )}
                          {owner.address && (
                            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{owner.address}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            openSendRequest({
                              receiverId: owner.userId,
                              receiverName: owner.name,
                              receiverRole: 'OWNER',
                              location: owner.location,
                              propertyId: owner.propertyId,
                              propertyName: owner.propertyName,
                              propertyType: owner.propertyType,
                              defaultRequestType: 'RENT_REQUEST',
                            })
                          }
                          className="shrink-0 rounded-xl border border-zinc-200 bg-zinc-900 px-2.5 py-1.5 text-[10px] font-bold text-white transition-all hover:bg-zinc-800 whitespace-nowrap"
                        >
                          Send Request
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Footer links */}
            <div className="sticky bottom-0 border-t border-zinc-100 bg-white px-4 py-2.5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  router.push(`/dashboard/agents?q=${encodeURIComponent(query)}`);
                  setOpen(false);
                }}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                View All Agents →
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push(`/search?q=${encodeURIComponent(query)}`);
                  setOpen(false);
                }}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Browse Properties →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Request Modal */}
      <SendPrivacyRequestModal
        target={requestTarget}
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
      />
    </>
  );
}
