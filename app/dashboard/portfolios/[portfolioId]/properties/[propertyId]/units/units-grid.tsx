'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { SubPropertyListItem } from '@/lib/sub-properties';
import type { RentableEntityNode } from '@/lib/rentable-entities';
import {
  subPropertyStatusBadgeClass,
  subPropertyStatusLabel,
  formatRent,
  formatArea,
} from '@/lib/sub-property-types';
import ViewToggle, { type View } from '@/components/ui/view-toggle';
import NotesIcon from '@/components/ui/notes-icon';
import UnitUtilities from '@/components/utilities/unit-utilities';
import RentableEntityTreeView from './rentable-entity-tree-view';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';

const STORAGE_KEY = 'domio-units-view';

const viewDetailClass =
  'inline-flex items-center rounded-full border border-[#5B4FE8]/40 px-3 py-1 text-xs text-[#8B6FE8] transition-colors hover:bg-[#5B4FE8]/10';

export default function UnitsGrid({
  portfolioId,
  propertyId,
  propertyName,
  units,
  rentableEntities = [],
}: {
  portfolioId: string;
  propertyId: string;
  propertyName: string;
  units: SubPropertyListItem[];
  rentableEntities?: RentableEntityNode[];
}) {
  const [items, setItems] = useState(units);
  const [target, setTarget] = useState<SubPropertyListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('card');
  const [displayTab, setDisplayTab] = useState<'hierarchy' | 'flat'>(
    rentableEntities.length > 0 ? 'hierarchy' : 'flat'
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(units);
  }, [units]);

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

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'card' || saved === 'table') setView(saved);
    setMounted(true);
  }, []);

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
    const res = await fetch(`/api/sub-properties/${target.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== target.id));
      setTarget(null);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setDeleting(false);
  }

  const base = `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units`;

  if (!mounted) return null;

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {propertyName}
          </h1>
          <p className="text-xs text-[#B0B0C8]">
            Variable Granularity Rental Management (Property / Floor / Room / Bed)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {displayTab === 'flat' && <ViewToggle view={view} onChange={changeView} />}
          <Link
            href={`${base}/new`}
            className="rounded-full border border-[#8B6FE8]/50 bg-[#5B4FE8] px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(91,79,232,0.3)] transition-colors hover:bg-[#4A3FD0]"
          >
            + Add Entity / Unit
          </Link>
        </div>
      </div>

      {/* Tabs for Granular Hierarchy vs Flat Units */}
      <div className="mt-4 flex border-b border-[#312D58] gap-4">
        <button
          type="button"
          onClick={() => setDisplayTab('hierarchy')}
          className={
            'pb-2 text-sm font-medium transition-colors border-b-2 ' +
            (displayTab === 'hierarchy'
              ? 'border-[#5B4FE8] text-white'
              : 'border-transparent text-[#B0B0C8] hover:text-white')
          }
        >
          Hierarchy Tree ({rentableEntities.length})
        </button>
        <button
          type="button"
          onClick={() => setDisplayTab('flat')}
          className={
            'pb-2 text-sm font-medium transition-colors border-b-2 ' +
            (displayTab === 'flat'
              ? 'border-[#5B4FE8] text-white'
              : 'border-transparent text-[#B0B0C8] hover:text-white')
          }
        >
          Flat Units List ({items.length})
        </button>
      </div>

      {displayTab === 'hierarchy' ? (
        <div className="mt-6">
          <RentableEntityTreeView entities={rentableEntities} />
        </div>
      ) : (
        <>
          {items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
              <p className="text-sm text-[#E8E8F2]">No flat units created yet.</p>
            </div>
          ) : view === 'card' ? (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col rounded-2xl border border-[#312D58] bg-[#17152F] p-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="flex items-center gap-1.5 font-semibold text-white">
                        {u.name}
                        <NotesIcon notes={u.notes} />
                      </h3>
                      <p className="text-xs text-[#B0B0C8]">Unit {u.unitNumber}</p>
                    </div>
                    <span
                      className={
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                        subPropertyStatusBadgeClass(u.status)
                      }
                    >
                      {subPropertyStatusLabel(u.status)}
                    </span>
                  </div>

                  <dl className="mt-4 flex-1 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#B0B0C8]">Floor</dt>
                      <dd className="text-[#E8E8F2]">{u.floor || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#B0B0C8]">Area</dt>
                      <dd className="text-[#E8E8F2]">{formatArea(u.areaSqft)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#B0B0C8]">Rent</dt>
                      <dd className="font-medium text-white">
                        {formatRent(u.rentAmount)}
                      </dd>
                    </div>
                    {u.currentTenantName && (
                      <div className="flex justify-between gap-3">
                        <dt className="text-[#B0B0C8]">Tenant</dt>
                        <dd className="truncate text-[#E8E8F2]">
                          {u.currentTenantName}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[#312D58] pt-4">
                    <Link href={`${base}/${u.id}`} className={viewDetailClass}>
                      View Detail →
                    </Link>
                    {u.status === 'VACANT' && (
                      <Link
                        href="/dashboard/tenants"
                        className="rounded-full border border-[#5B4FE8]/40 bg-[#5B4FE8]/15 px-3 py-1 text-xs font-medium text-[#8B6FE8] transition-colors hover:bg-[#5B4FE8]/25"
                      >
                        Assign Tenant
                      </Link>
                    )}
                    <Link
                      href={`${base}/${u.id}/edit`}
                      className="rounded-full border border-[rgba(139,111,232,0.4)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium text-[#E8E8F2] transition-colors hover:text-white"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setTarget(u);
                      }}
                      className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-4 border-t border-[#312D58] pt-4">
                    <UnitUtilities subPropertyId={u.id} propertyId={propertyId} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-[#1A1A2A]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#1A1A2A] text-xs uppercase tracking-wide text-[#8B6FE8]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Unit Number</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Floor</th>
                    <th className="px-5 py-3 font-medium">Area</th>
                    <th className="px-5 py-3 font-medium">Rent</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Tenant</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A2A]">
                  {items.map((u, i) => (
                    <tr
                      key={u.id}
                      className={
                        i % 2 === 0 ? 'bg-[#0E0C22]' : 'bg-[rgba(255,255,255,0.02)]'
                      }
                    >
                      <td className="px-5 py-3 font-medium text-white">
                        {u.unitNumber}
                      </td>
                      <td className="px-5 py-3 text-[#6A6A8A]">
                        <span className="inline-flex items-center gap-1.5">
                          {u.name}
                          <NotesIcon notes={u.notes} />
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#6A6A8A]">{u.floor || '—'}</td>
                      <td className="px-5 py-3 text-[#6A6A8A]">
                        {formatArea(u.areaSqft)}
                      </td>
                      <td className="px-5 py-3 text-[#6A6A8A]">
                        {formatRent(u.rentAmount)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                            subPropertyStatusBadgeClass(u.status)
                          }
                        >
                          {subPropertyStatusLabel(u.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#6A6A8A]">
                        {u.currentTenantName || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Link href={`${base}/${u.id}`} className={viewDetailClass}>
                            View Detail →
                          </Link>
                          {u.status === 'VACANT' && (
                            <Link
                              href="/dashboard/tenants"
                              className="rounded-full border border-[#5B4FE8]/50 bg-[#5B4FE8] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#4A3FD0]"
                            >
                              Assign Tenant
                            </Link>
                          )}
                          <Link
                            href={`${base}/${u.id}/edit`}
                            className="rounded-full border border-[rgba(139,111,232,0.4)] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium text-[#E8E8F2] transition-colors hover:text-white"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setError(null);
                              setTarget(u);
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
        </>
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
              Delete unit
            </h2>
            <p className="mt-2 text-sm text-[#E8E8F2]">
              Are you sure you want to delete {target.name} (Unit{' '}
              {target.unitNumber})? This action cannot be undone.
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
