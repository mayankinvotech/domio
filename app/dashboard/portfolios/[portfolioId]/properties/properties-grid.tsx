'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PropertyListItem } from '@/lib/properties';
import {
  propertyTypeBadgeClass,
  propertyTypeLabel,
  propertyStatusBadgeClass,
  propertyStatusLabel,
} from '@/lib/property-types';
import ViewToggle, { type View } from '@/components/ui/view-toggle';
import NotesIcon from '@/components/ui/notes-icon';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';

const STORAGE_KEY = 'domio-properties-view';

// "X / Y occupied" — gold if any unit is not occupied, lavender if all occupied.
function OccupiedStat({ occupied, total }: { occupied: number; total: number }) {
  const allOccupied = occupied === total;
  return (
    <span
      title="Occupied units"
      className={
        'whitespace-nowrap text-xs font-medium ' +
        (allOccupied ? 'text-[#8B6FE8]' : 'text-[#E8A020]')
      }
    >
      {occupied} / {total} occupied
    </span>
  );
}

export default function PropertiesGrid({
  portfolioId,
  portfolioName,
  properties,
}: {
  portfolioId: string;
  portfolioName: string;
  properties: PropertyListItem[];
}) {
  const [items, setItems] = useState(properties);
  const [target, setTarget] = useState<PropertyListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('card');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(properties);
  }, [properties]);

  // Restore the saved view preference after mount (avoids SSR mismatch + flash).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'card' || saved === 'table') setView(saved);
    setMounted(true);
  }, []);

  // Lock scroll + close on Escape while the delete modal is open.
  useScrollLock(!!target);
  const trapRef = useFocusTrap<HTMLDivElement>(!!target);
  useEffect(() => {
    if (!target) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeConfirm();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [target, deleting]); // eslint-disable-line react-hooks/exhaustive-deps

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage failures */
    }
  }

  function closeConfirm() {
    if (deleting) return;
    setTarget(null);
    setError(null);
  }

  async function confirmDelete() {
    if (!target) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/properties/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== target.id));
      setTarget(null);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setDeleting(false);
  }

  function editHref(id: string) {
    return `/dashboard/portfolios/${portfolioId}/properties/${id}/edit`;
  }

  function unitsHref(id: string) {
    return `/dashboard/portfolios/${portfolioId}/properties/${id}/units`;
  }

  // Avoid a card→table flash before the saved view preference is read.
  if (!mounted) return null;

  return (
    <>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {portfolioName}
        </h1>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={changeView} />
          <Link
            href={`/dashboard/portfolios/${portfolioId}/properties/new`}
            className="rounded-full border border-[#8B6FE8]/50 bg-[#5B4FE8] px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(91,79,232,0.3)] transition-colors hover:bg-[#4A3FD0]"
          >
            Add Property
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
          <p className="text-sm text-[#E8E8F2]">No properties yet</p>
        </div>
      ) : view === 'card' ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-2xl border border-[#312D58] bg-[#17152F] p-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-1.5 font-semibold text-white">
                  {p.name}
                  <NotesIcon notes={p.notes} />
                </h3>
                <span
                  className={
                    'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                    propertyStatusBadgeClass(p.status)
                  }
                >
                  {propertyStatusLabel(p.status)}
                </span>
              </div>

              <p className="mt-2 text-sm text-[#E8E8F2]">{p.address}</p>
              <p className="text-sm text-[#B0B0C8]">
                {p.city}, {p.country}
              </p>

              <div className="mt-3 flex flex-1 items-center justify-between gap-2">
                <span
                  className={
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                    propertyTypeBadgeClass(p.type)
                  }
                >
                  {propertyTypeLabel(p.type)}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    title="Utility accounts"
                    className="whitespace-nowrap text-xs font-medium text-[#B0B0C8]"
                  >
                    ⚡ {p.utilityAccountCount}
                  </span>
                  <OccupiedStat occupied={p.occupiedCount} total={p.unitCount} />
                  {/* Unit count badge + hover tooltip (clickable → units page) */}
                  <span className="group/tip relative">
                    <Link
                      href={unitsHref(p.id)}
                      className="block rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-2.5 py-0.5 text-xs font-medium text-[#E8E8F2] transition-colors hover:border-[#5B4FE8]/60"
                    >
                      {p.unitCount} {p.unitCount === 1 ? 'unit' : 'units'}
                    </Link>
                    <span className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden group-hover/tip:block">
                      <span className="block w-max max-w-[220px] rounded-lg border border-[#1A1A2A] bg-[#0E0C22] px-3 py-2 text-left text-xs text-[#E8E8F2] shadow-xl">
                        {p.units.length === 0 ? (
                          'No units yet'
                        ) : (
                          p.units.map((u) => (
                            <span key={u.id} className="block truncate">
                              Unit {u.unitNumber}
                            </span>
                          ))
                        )}
                      </span>
                    </span>
                  </span>
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-[#312D58] pt-4">
                <Link
                  href={`${unitsHref(p.id)}/new`}
                  className="rounded-full border border-[#5B4FE8]/40 bg-[#5B4FE8]/15 px-3 py-1 text-xs font-medium text-[#8B6FE8] transition-colors hover:bg-[#5B4FE8]/25"
                >
                  Add Unit
                </Link>
                <Link
                  href={editHref(p.id)}
                  className="rounded-full border border-[rgba(139,111,232,0.4)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium text-[#E8E8F2] transition-colors hover:text-white"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setTarget(p);
                  }}
                  className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-[#1A1A2A]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#1A1A2A] text-xs uppercase tracking-wide text-[#8B6FE8]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Address</th>
                <th className="px-5 py-3 font-medium">City</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Units</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A2A]">
              {items.map((p, i) => (
                <tr
                  key={p.id}
                  className={
                    i % 2 === 0 ? 'bg-[#0E0C22]' : 'bg-[rgba(255,255,255,0.02)]'
                  }
                >
                  <td className="px-5 py-3 font-medium text-white">
                    <span className="inline-flex items-center gap-1.5">
                      {p.name}
                      <NotesIcon notes={p.notes} />
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#6A6A8A]">{p.address}</td>
                  <td className="px-5 py-3 text-[#6A6A8A]">{p.city}</td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                        propertyTypeBadgeClass(p.type)
                      }
                    >
                      {propertyTypeLabel(p.type)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                        propertyStatusBadgeClass(p.status)
                      }
                    >
                      {propertyStatusLabel(p.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={unitsHref(p.id)}
                      className="font-medium text-[#8B6FE8] transition-colors hover:text-[#A78BFF]"
                    >
                      {p.unitCount} {p.unitCount === 1 ? 'unit' : 'units'}
                    </Link>
                    <div className="mt-0.5">
                      <OccupiedStat occupied={p.occupiedCount} total={p.unitCount} />
                    </div>
                    <div className="mt-0.5 text-xs text-[#B0B0C8]">
                      ⚡ {p.utilityAccountCount}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`${unitsHref(p.id)}/new`}
                        className="rounded-full border border-[#5B4FE8]/50 bg-[#5B4FE8] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#4A3FD0]"
                      >
                        Add Unit
                      </Link>
                      <Link
                        href={editHref(p.id)}
                        className="rounded-full border border-[rgba(139,111,232,0.4)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium text-[#E8E8F2] transition-colors hover:text-white"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setTarget(p);
                        }}
                        className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeConfirm}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            ref={trapRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Delete property
            </h2>
            <p className="mt-2 text-sm text-[#E8E8F2]">
              Are you sure you want to delete {target.name}? This action cannot be
              undone.
            </p>

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
                onClick={closeConfirm}
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
