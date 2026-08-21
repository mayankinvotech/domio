'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OwnerListItem } from '@/lib/owners';
import OwnerStatusToggle from './owner-status-toggle';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export default function OwnersTable({ owners }: { owners: OwnerListItem[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(owners);
  const [target, setTarget] = useState<OwnerListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync if the server sends fresh data (e.g. after navigating back).
  // Client-only updates (toggle/delete) don't change the prop, so they're safe.
  useEffect(() => {
    setRows(owners);
  }, [owners]);

  function openConfirm(owner: OwnerListItem) {
    setError(null);
    setTarget(owner);
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

    const res = await fetch(`/api/owners/${target.id}`, { method: 'DELETE' });
    if (res.ok) {
      setRows((rs) => rs.filter((r) => r.id !== target.id));
      setTarget(null);
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to delete. Please try again.');
    }
    setDeleting(false);
  }

  function updateActive(id: string, active: boolean) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, active } : r)));
  }

  return (
    <>
      <p className="mt-1 text-sm text-[#E8E8F2]">
        {rows.length} owner{rows.length === 1 ? '' : 's'}
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-[#312D58] bg-[#17152F] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#312D58] bg-[#242140] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Account ID</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Phone Number</th>
              <th className="px-5 py-3 font-medium">Created Date</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#312D58]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-[#E8E8F2]">
                  No owners yet. Click “Add Owner” to create one.
                </td>
              </tr>
            ) : (
              rows.map((owner) => (
                <tr
                  key={owner.id}
                  onClick={() => router.push(`/dashboard/owners/${owner.id}`)}
                  className="cursor-pointer transition-colors hover:bg-zinc-50"
                >
                  <td className="px-5 py-3 font-medium text-white">
                    {owner.name}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500">
                    {owner.accountId ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-[#E8E8F2]">{owner.email}</td>
                  <td className="px-5 py-3 text-[#E8E8F2]">
                    {owner.phone || '—'}
                  </td>
                  <td className="px-5 py-3 text-[#E8E8F2]">
                    {dateFmt.format(new Date(owner.createdAt))}
                  </td>
                  <td className="px-5 py-3">
                    {owner.active ? (
                      <span className="inline-flex items-center rounded-full border border-zinc-700/30 bg-zinc-900/15 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td
                    className="px-5 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <OwnerStatusToggle
                        id={owner.id}
                        active={owner.active}
                        onToggled={(active) => updateActive(owner.id, active)}
                      />
                      <button
                        type="button"
                        onClick={() => openConfirm(owner)}
                        className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {target && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeConfirm}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Delete owner
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
