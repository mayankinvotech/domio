'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UtilityAccountListItem } from '@/lib/utilities';
import {
  utilityTypeIcon,
  utilityTypeLabel,
  UTILITY_TYPES,
} from '@/lib/utility-types';
import ViewToggle, { type View } from '@/components/ui/view-toggle';
import { useScrollLock } from '@/hooks/use-scroll-lock';

const STORAGE_KEY = 'domio-utility-accounts-view';
const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AccountsSection({
  accounts,
}: {
  accounts: UtilityAccountListItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(accounts);
  const [view, setView] = useState<View>('card');
  // Add-bill modal target + delete confirm target.
  const [billFor, setBillFor] = useState<UtilityAccountListItem | null>(null);
  const [deleteFor, setDeleteFor] = useState<UtilityAccountListItem | null>(null);
  const [editFor, setEditFor] = useState<UtilityAccountListItem | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setItems(accounts);
  }, [accounts]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'card' || saved === 'table') setView(saved);
    setMounted(true);
  }, []);

  // Lock scroll + close on Escape while any modal (add-bill / delete / edit).
  useScrollLock(!!billFor || !!deleteFor || !!editFor);
  useEffect(() => {
    if (!billFor && !deleteFor && !editFor) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) {
        setBillFor(null);
        setDeleteFor(null);
        setEditFor(null);
        setError(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [billFor, deleteFor, editFor, pending]);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function closeBill() {
    if (pending) return;
    setBillFor(null);
    setError(null);
  }
  function closeDelete() {
    if (pending) return;
    setDeleteFor(null);
    setError(null);
  }
  function closeEdit() {
    if (pending) return;
    setEditFor(null);
    setError(null);
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editFor) return;
    setPending(true);
    setError(null);
    const d = new FormData(event.currentTarget);
    const res = await fetch(`/api/utility-accounts/${editFor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: d.get('type'),
        provider: d.get('provider'),
        accountNumber: d.get('accountNumber'),
        notes: d.get('notes'),
      }),
    });
    if (res.ok) {
      setEditFor(null);
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? 'Failed to update. Please try again.');
    }
    setPending(false);
  }

  async function submitBill(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!billFor) return;
    setPending(true);
    setError(null);
    const d = new FormData(event.currentTarget);
    const res = await fetch('/api/utility-bills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        utilityAccountId: billFor.id,
        billDate: d.get('billDate'),
        dueDate: d.get('dueDate'),
        amount: d.get('amount'),
        notes: d.get('notes'),
      }),
    });
    if (res.ok) {
      setBillFor(null);
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? 'Failed to add bill. Please try again.');
    }
    setPending(false);
  }

  async function confirmDelete() {
    if (!deleteFor) return;
    setPending(true);
    setError(null);
    const res = await fetch(`/api/utility-accounts/${deleteFor.id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setItems((xs) => xs.filter((x) => x.id !== deleteFor.id));
      setDeleteFor(null);
      router.refresh();
    } else {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? 'Failed to delete. Please try again.');
    }
    setPending(false);
  }

  const addBillBtn =
    'rounded-full border border-zinc-300 bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800';
  const deleteBtn =
    'rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10';
  const editBtn =
    'rounded-full border border-zinc-200 bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium text-[#E8E8F2] transition-colors hover:text-white';

  // Avoid a card→table flash before the saved view preference is read.
  if (!mounted) return null;

  return (
    <>
      <div className="flex justify-end">
        <ViewToggle view={view} onChange={changeView} />
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
          <p className="text-sm text-[#E8E8F2]">No utility accounts yet</p>
        </div>
      ) : view === 'card' ? (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex flex-col rounded-2xl border border-[#312D58] bg-[#17152F] p-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>
                    {utilityTypeIcon(a.type)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{a.provider}</h3>
                    <p className="text-xs text-[#B0B0C8]">
                      {utilityTypeLabel(a.type)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-2.5 py-0.5 text-xs font-medium text-[#E8E8F2]">
                  {a.billCount} {a.billCount === 1 ? 'bill' : 'bills'}
                </span>
              </div>

              <dl className="mt-3 flex-1 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#B0B0C8]">Account #</dt>
                  <dd className="truncate text-[#E8E8F2]">{a.accountNumber}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#B0B0C8]">Linked to</dt>
                  <dd className="truncate text-[#E8E8F2]">{a.linkedLabel}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#312D58] pt-4">
                <button type="button" onClick={() => { setError(null); setBillFor(a); }} className={addBillBtn}>
                  Add Bill
                </button>
                <button type="button" onClick={() => { setError(null); setEditFor(a); }} className={editBtn}>
                  Edit
                </button>
                <button type="button" onClick={() => { setError(null); setDeleteFor(a); }} className={deleteBtn}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#1A1A2A]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#1A1A2A] text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Provider</th>
                <th className="px-5 py-3 font-medium">Account #</th>
                <th className="px-5 py-3 font-medium">Linked To</th>
                <th className="px-5 py-3 font-medium">Bills</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A2A]">
              {items.map((a, i) => (
                <tr
                  key={a.id}
                  className={
                    i % 2 === 0 ? 'bg-[#0E0C22]' : 'bg-[rgba(255,255,255,0.02)]'
                  }
                >
                  <td className="px-5 py-3 text-[#E8E8F2]">
                    <span aria-hidden>{utilityTypeIcon(a.type)}</span>{' '}
                    {utilityTypeLabel(a.type)}
                  </td>
                  <td className="px-5 py-3 font-medium text-white">
                    {a.provider}
                  </td>
                  <td className="px-5 py-3 text-[#6A6A8A]">{a.accountNumber}</td>
                  <td className="px-5 py-3 text-[#6A6A8A]">{a.linkedLabel}</td>
                  <td className="px-5 py-3 text-[#6A6A8A]">{a.billCount}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setError(null); setBillFor(a); }} className={addBillBtn}>
                        Add Bill
                      </button>
                      <button type="button" onClick={() => { setError(null); setEditFor(a); }} className={editBtn}>
                        Edit
                      </button>
                      <button type="button" onClick={() => { setError(null); setDeleteFor(a); }} className={deleteBtn}>
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

      {/* Add Bill modal */}
      {billFor && (
        <div role="dialog" aria-modal="true" onClick={closeBill} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitBill} className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl">
            <h2 className="text-lg font-semibold tracking-tight text-white">Add Bill</h2>
            <p className="mt-1 mb-4 text-sm text-[#B0B0C8]">
              {utilityTypeLabel(billFor.type)} · {billFor.provider}
            </p>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="billDate" className={labelClass}>Bill Date</label>
                  <input id="billDate" name="billDate" type="date" required defaultValue={today()} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="dueDate" className={labelClass}>Due Date</label>
                  <input id="dueDate" name="dueDate" type="date" required defaultValue={today()} className={inputClass} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="amount" className={labelClass}>Amount</label>
                <input id="amount" name="amount" type="number" min="0" step="any" required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes" className={labelClass}>Notes <span className="text-[#B0B0C8]">(optional)</span></label>
                <input id="notes" name="notes" type="text" className={inputClass} />
              </div>
            </div>
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeBill} disabled={pending} className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={pending} className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60">{pending ? 'Saving…' : 'Add Bill'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete account confirm */}
      {deleteFor && (
        <div role="dialog" aria-modal="true" onClick={closeDelete} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl">
            <h2 className="text-lg font-semibold tracking-tight text-white">Delete account</h2>
            <p className="mt-2 text-sm text-[#E8E8F2]">
              Delete the {utilityTypeLabel(deleteFor.type)} account with {deleteFor.provider}? This cannot be undone.
            </p>
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeDelete} disabled={pending} className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60">Cancel</button>
              <button type="button" onClick={confirmDelete} disabled={pending} className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60">{pending ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit account modal */}
      {editFor && (
        <div role="dialog" aria-modal="true" onClick={closeEdit} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onClick={(e) => e.stopPropagation()} onSubmit={submitEdit} className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl">
            <h2 className="text-lg font-semibold tracking-tight text-white">Edit utility account</h2>
            <p className="mt-1 mb-4 text-sm text-[#B0B0C8]">{editFor.linkedLabel}</p>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-type" className={labelClass}>Type</label>
                <select id="edit-type" name="type" defaultValue={editFor.type} className={inputClass}>
                  {UTILITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-provider" className={labelClass}>Provider</label>
                <input id="edit-provider" name="provider" type="text" required defaultValue={editFor.provider} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-account" className={labelClass}>Account Number</label>
                <input id="edit-account" name="accountNumber" type="text" required defaultValue={editFor.accountNumber} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-notes" className={labelClass}>Notes <span className="text-[#B0B0C8]">(optional)</span></label>
                <input id="edit-notes" name="notes" type="text" defaultValue={editFor.notes ?? ''} className={inputClass} />
              </div>
            </div>
            {error && <p role="alert" className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={closeEdit} disabled={pending} className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={pending} className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60">{pending ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
