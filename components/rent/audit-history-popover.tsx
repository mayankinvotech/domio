'use client';

import { useEffect, useState } from 'react';

type AuditEntity = 'LEDGER_ENTRY' | 'RENT_LEDGER';
type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

type AuditItem = {
  id: string;
  action: AuditAction;
  actorName: string;
  actorRole: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields: string[];
  reason: string | null;
  createdAt: string;
};

const FIELD_LABEL: Record<string, string> = {
  type: 'Type',
  amount: 'Amount',
  date: 'Date',
  rentFor: 'Rent for',
  description: 'Description',
  dueDate: 'Due date',
  amountDue: 'Amount due',
  amountPaid: 'Amount paid',
  paidDate: 'Paid date',
  reference: 'Reference',
  notes: 'Notes',
  paymentMethod: 'Payment method',
  status: 'Status',
};

const ACTION_STYLE: Record<AuditAction, { label: string; cls: string }> = {
  CREATE: { label: 'Created', cls: 'text-emerald-700 font-semibold' },
  UPDATE: { label: 'Edited', cls: 'text-blue-700 font-semibold' },
  DELETE: { label: 'Deleted', cls: 'text-red-700 font-semibold' },
};

const dtFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(d);
    }
  }
  if (typeof v === 'number') return v.toLocaleString('en-IN');
  return String(v);
}

// A dropdown panel showing an entity's audit history. Fetches on open.
export default function AuditHistoryPopover({
  entity,
  entityId,
}: {
  entity: AuditEntity;
  entityId: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || items !== null) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/audit/${entity}/${encodeURIComponent(entityId)}`);
      if (cancelled) return;
      if (res.ok) {
        const data = await res.json();
        setItems(data.entries as AuditItem[]);
      } else {
        setError('Could not load history.');
        setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, items, entity, entityId]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="View change history"
        aria-label="View change history"
        className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-100 hover:border-zinc-300 hover:text-zinc-900"
      >
        History
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-50 mt-1 max-h-80 w-80 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-3.5 text-left shadow-xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-700">
              Change history
            </p>
            {items === null && (
              <p className="py-2 text-sm text-zinc-500">Loading…</p>
            )}
            {error && <p className="py-2 text-sm text-red-600">{error}</p>}
            {items !== null && items.length === 0 && !error && (
              <p className="py-2 text-sm text-zinc-500">
                No history recorded for this record.
              </p>
            )}
            <ul className="flex flex-col gap-3">
              {items?.map((it) => {
                const style = ACTION_STYLE[it.action];
                return (
                  <li
                    key={it.id}
                    className="border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={'text-xs font-bold ' + style.cls}>
                        {style.label}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {dtFmt.format(new Date(it.createdAt))}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-zinc-700">
                      {it.actorName}{' '}
                      <span className="text-zinc-400 font-normal">
                        ({it.actorRole.toLowerCase()})
                      </span>
                    </p>
                    {it.action === 'UPDATE' && it.before && it.after && (
                      <ul className="mt-1 flex flex-col gap-0.5 rounded-lg bg-zinc-50 p-2 text-xs">
                        {it.changedFields.map((f) => (
                          <li key={f} className="text-zinc-600">
                            <span className="font-semibold text-zinc-700">
                              {FIELD_LABEL[f] ?? f}:
                            </span>{' '}
                            <span className="line-through text-zinc-400">{fmtValue(it.before![f])}</span> →{' '}
                            <span className="font-semibold text-zinc-900">
                              {fmtValue(it.after![f])}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {it.reason && (
                      <p className="mt-1 text-xs italic text-zinc-500">
                        “{it.reason}”
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
