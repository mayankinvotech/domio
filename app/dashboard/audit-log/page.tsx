import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { resolveDataScope } from '@/lib/manager-access';
import { listAuditForOwner, type AuditLogItem } from '@/lib/audit';
import type { AuditEntity, AuditAction } from '@prisma/client';
import AuditFilters from './audit-filters';

const dtFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const ENTITY_LABEL: Record<AuditEntity, string> = {
  LEDGER_ENTRY: 'Transaction',
  RENT_LEDGER: 'Rent record',
};
const ACTION_STYLE: Record<AuditAction, { label: string; cls: string }> = {
  CREATE: {
    label: 'Created',
    cls: 'border-green-500/30 bg-green-500/10 text-green-400',
  },
  UPDATE: {
    label: 'Edited',
    cls: 'border-zinc-700/30 bg-zinc-900/15 text-zinc-500',
  },
  DELETE: {
    label: 'Deleted',
    cls: 'border-red-500/30 bg-red-500/10 text-red-400',
  },
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
  paymentMethod: 'Method',
  status: 'Status',
};

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return dateFmt.format(d);
  }
  if (typeof v === 'number') return v.toLocaleString('en-IN');
  return String(v);
}

function changeSummary(item: AuditLogItem): string {
  const before = (item.before ?? null) as Record<string, unknown> | null;
  const after = (item.after ?? null) as Record<string, unknown> | null;
  if (item.action === 'CREATE') return 'Record created';
  if (item.action === 'DELETE') return 'Record deleted';
  if (!before || !after || item.changedFields.length === 0) return '—';
  return item.changedFields
    .map(
      (f) =>
        `${FIELD_LABEL[f] ?? f}: ${fmtVal(before[f])} → ${fmtVal(after[f])}`,
    )
    .join('; ');
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const sp = await searchParams;

  const ds = await resolveDataScope(session.user);
  const entity =
    sp.entity === 'LEDGER_ENTRY' || sp.entity === 'RENT_LEDGER'
      ? (sp.entity as AuditEntity)
      : undefined;
  const action =
    sp.action === 'CREATE' || sp.action === 'UPDATE' || sp.action === 'DELETE'
      ? (sp.action as AuditAction)
      : undefined;

  const entries = await listAuditForOwner(ds.ownerId, {
    entity,
    action,
    subPropertyIds: ds.isManager ? ds.scope.subPropertyIds : undefined,
    take: 200,
  });

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight text-white">
        Rent Ledger Audit Log
      </h1>
      <p className="mt-1 text-sm text-[#6A6A8A]">
        Every change to rent charges, payments and monthly rent records.
        {ds.isManager && ' Showing entries for units you can access.'}
      </p>

      <div className="mt-6">
        <AuditFilters
          current={{ entity: sp.entity ?? '', action: sp.action ?? '' }}
        />
      </div>

      {entries.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
          <div className="text-4xl">🗒️</div>
          <p className="mt-3 text-sm text-[#E8E8F2]">
            No changes recorded yet
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Ledger</th>
                <th className="px-4 py-3 font-medium">Tenant / Unit</th>
                <th className="px-4 py-3 font-medium">Change</th>
                <th className="px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {entries.map((it) => {
                const style = ACTION_STYLE[it.action];
                return (
                  <tr
                    key={it.id}
                    className="align-top transition-colors hover:bg-zinc-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-[#6A6A8A]">
                      {dtFmt.format(new Date(it.createdAt))}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#E8E8F2]">{it.actorName}</span>
                      <span className="ml-1 text-xs text-[#4A4A6A]">
                        {it.actorRole.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ' +
                          style.cls
                        }
                      >
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6A6A8A]">
                      {ENTITY_LABEL[it.entity]}
                    </td>
                    <td className="px-4 py-3 text-[#B0B0C8]">
                      {it.tenant?.name ?? '—'}
                      {it.unit && (
                        <span className="block text-xs text-[#4A4A6A]">
                          Unit {it.unit.unitNumber}
                        </span>
                      )}
                    </td>
                    <td className="max-w-sm px-4 py-3 text-xs text-zinc-500">
                      {changeSummary(it)}
                    </td>
                    <td className="px-4 py-3 text-xs italic text-[#6A6A8A]">
                      {it.reason ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
