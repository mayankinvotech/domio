'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { Button, ButtonLink } from '@/components/ui/button';
import type { ManagerListItem } from '@/lib/managers';

const glassCard =
  'rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] p-5 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]';
const sectionLabel =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500';

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
}

export default function ManagersGrid({
  managers,
}: {
  managers: ManagerListItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(managers);
  const [target, setTarget] = useState<ManagerListItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setItems(managers), [managers]);

  // Lock scroll + close on Escape while the delete modal is open.
  useScrollLock(!!target);
  useEffect(() => {
    if (!target) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setTarget(null);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [target, busy]);

  const activeCount = items.filter((m) => m.active).length;
  const assignedTotal = items.reduce((s, m) => s + m.accessCount, 0);

  async function toggleActive(m: ManagerListItem) {
    if (togglingId) return; // guard against double-clicks
    setTogglingId(m.id);
    try {
      const res = await fetch(`/api/managers/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !m.active }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setItems((xs) =>
        xs.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)),
      );
    } catch {
      alert('Failed to update manager status. Please try again.');
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!target) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/managers/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== target.id));
      setTarget(null);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Property Managers
        </h1>
        <Link
          href="/dashboard/managers/new"
          className="rounded-full border border-zinc-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
        >
          + Add Manager
        </Link>
      </div>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={glassCard}>
          <p className={sectionLabel}>Total Managers</p>
          <p className="mt-2 text-2xl font-bold text-white">{items.length}</p>
        </div>
        <div className={glassCard}>
          <p className={sectionLabel}>Active Managers</p>
          <p className="mt-2 text-2xl font-bold text-zinc-500">{activeCount}</p>
        </div>
        <div className={glassCard}>
          <p className={sectionLabel}>Properties Assigned</p>
          <p className="mt-2 text-2xl font-bold text-[#E8A020]">{assignedTotal}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
          <div className="text-5xl">👥</div>
          <p className="mt-4 text-lg font-semibold text-white">No managers yet</p>
          <p className="mt-1 text-sm text-[#6A6A8A]">
            Add a property manager and assign them properties to manage.
          </p>
          <Link
            href="/dashboard/managers/new"
            className="mt-5 inline-flex rounded-full border border-zinc-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            + Add Manager
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((m) => (
            <div key={m.id} className={glassCard}>
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900/20 text-sm font-semibold text-zinc-500">
                  {initials(m.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-white">{m.name}</span>
                    {m.displayId && (
                      <span className="font-mono text-[11px] text-[#4A4A6A]">
                        {m.displayId}
                      </span>
                    )}
                    <span
                      className={
                        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ' +
                        (m.active
                          ? 'border border-zinc-700/30 bg-zinc-900/15 text-zinc-500'
                          : 'border border-red-500/20 bg-red-500/10 text-red-400')
                      }
                    >
                      {m.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#6A6A8A]">
                    {m.email}
                    {m.phone ? ` · ${m.phone}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6A6A8A]">
                    {m.accessCount}{' '}
                    {m.accessCount === 1 ? 'property' : 'properties'} assigned
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
                <ButtonLink
                  href={`/dashboard/managers/${m.id}/access`}
                  variant="ghost"
                  size="md"
                >
                  Manage Access
                </ButtonLink>
                <ButtonLink
                  href={`/dashboard/managers/${m.id}/edit`}
                  variant="outline"
                  size="md"
                >
                  Edit
                </ButtonLink>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => toggleActive(m)}
                  disabled={togglingId === m.id}
                >
                  {togglingId === m.id
                    ? 'Saving…'
                    : m.active
                      ? 'Deactivate'
                      : 'Activate'}
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => {
                    setError(null);
                    setTarget(m);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => !busy && setTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Delete manager
            </h2>
            <p className="mt-2 text-sm text-[#E8E8F2]">
              Delete {target.name}? This removes their account and all property
              access. This cannot be undone.
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
                onClick={() => !busy && setTarget(null)}
                disabled={busy}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
