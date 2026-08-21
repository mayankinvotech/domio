'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { TenancyStatus } from '@prisma/client';
import {
  tenancyStatusBadgeClass,
  tenancyStatusLabel,
  formatMoney,
  formatDate,
} from '@/lib/tenancy-types';

export type HistoryRow = {
  id: string;
  status: TenancyStatus;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  unitName: string;
  unitNumber: string;
  unitHref: string;
};

export default function TenancyHistory({ rows }: { rows: HistoryRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function terminate(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/tenancies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'TERMINATED' }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to terminate. Please try again.');
    }
    setBusyId(null);
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-10 text-center">
        <p className="text-sm text-[#E8E8F2]">No tenancies yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1A1A2A]">
      {error && (
        <p role="alert" className="bg-red-500/10 px-5 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
      <table className="w-full text-left text-sm">
        <thead className="bg-[#1A1A2A] text-xs uppercase tracking-wide text-[#8B6FE8]">
          <tr>
            <th className="px-5 py-3 font-medium">Unit</th>
            <th className="px-5 py-3 font-medium">Dates</th>
            <th className="px-5 py-3 font-medium">Rent</th>
            <th className="px-5 py-3 font-medium">Status</th>
            <th className="px-5 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A1A2A]">
          {rows.map((r, i) => (
            <tr
              key={r.id}
              className={
                i % 2 === 0 ? 'bg-[#0E0C22]' : 'bg-[rgba(255,255,255,0.02)]'
              }
            >
              <td className="px-5 py-3 font-medium text-white">
                <Link href={r.unitHref} className="transition-colors hover:text-[#8B6FE8]">
                  Unit {r.unitNumber} — {r.unitName}
                </Link>
              </td>
              <td className="px-5 py-3 text-[#6A6A8A]">
                {formatDate(r.startDate)} → {formatDate(r.endDate)}
              </td>
              <td className="px-5 py-3 text-[#6A6A8A]">
                {formatMoney(r.monthlyRent)}/mo
              </td>
              <td className="px-5 py-3">
                <span
                  className={
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                    tenancyStatusBadgeClass(r.status)
                  }
                >
                  {tenancyStatusLabel(r.status)}
                </span>
              </td>
              <td className="px-5 py-3 text-right">
                {r.status === 'ACTIVE' ? (
                  <button
                    type="button"
                    onClick={() => terminate(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-60"
                  >
                    {busyId === r.id ? 'Terminating…' : 'Terminate'}
                  </button>
                ) : (
                  <span className="text-xs text-[#4A4A6A]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
