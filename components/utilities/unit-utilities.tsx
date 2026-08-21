'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { UtilityAccountListItem, UtilityBillListItem } from '@/lib/utilities';
import {
  utilityTypeIcon,
  utilityTypeLabel,
  billStatusBadgeClass,
  billStatusLabel,
} from '@/lib/utility-types';
import { formatMoney, formatDate } from '@/lib/tenancy-types';

// Bills for one account — fetched lazily when expanded.
function AccountBills({ accountId }: { accountId: string }) {
  const [bills, setBills] = useState<UtilityBillListItem[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/utility-bills?utilityAccountId=${encodeURIComponent(accountId)}`)
      .then((r) => (r.ok ? r.json() : { bills: [] }))
      .then((d) => {
        if (active) setBills(d.bills as UtilityBillListItem[]);
      })
      .catch(() => active && setBills([]));
    return () => {
      active = false;
    };
  }, [accountId]);

  if (bills === null) {
    return <p className="px-2 py-2 text-xs text-[#B0B0C8]">Loading bills…</p>;
  }
  if (bills.length === 0) {
    return <p className="px-2 py-2 text-xs text-[#B0B0C8]">No bills yet.</p>;
  }
  return (
    <ul className="mt-1 space-y-1">
      {bills.map((b) => (
        <li
          key={b.id}
          className="flex items-center justify-between gap-2 rounded-md bg-[rgba(255,255,255,0.02)] px-2 py-1 text-xs"
        >
          <span className="text-[#B0B0C8]">{formatDate(b.dueDate)}</span>
          <span className="text-[#E8E8F2]">{formatMoney(b.amount)}</span>
          <span
            className={
              'rounded-full px-2 py-0.5 text-[10px] font-medium ' +
              billStatusBadgeClass(b.status)
            }
          >
            {billStatusLabel(b.status)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function UnitUtilities({
  subPropertyId,
  propertyId,
}: {
  subPropertyId: string;
  propertyId: string;
}) {
  const [accounts, setAccounts] = useState<UtilityAccountListItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(
      `/api/utility-accounts?subPropertyId=${encodeURIComponent(subPropertyId)}`,
    )
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d) => {
        if (active) setAccounts(d.accounts as UtilityAccountListItem[]);
      })
      .catch(() => active && setAccounts([]));
    return () => {
      active = false;
    };
  }, [subPropertyId]);

  const addHref = `/dashboard/utilities/accounts/new?subPropertyId=${subPropertyId}&propertyId=${propertyId}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          ⚡ Utilities
        </h4>
        <Link
          href={addHref}
          className="rounded-full border border-zinc-200 bg-zinc-900/15 px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-900/25"
        >
          Add Utility Account
        </Link>
      </div>

      <div className="mt-2">
        {accounts === null ? (
          <p className="text-xs text-[#B0B0C8]">Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="text-xs text-[#B0B0C8]">No utility accounts for this unit.</p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.04)] p-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span aria-hidden>{utilityTypeIcon(a.type)}</span>
                    <span className="truncate text-sm text-[#E8E8F2]">
                      <span className="font-medium text-white">
                        {a.provider}
                      </span>{' '}
                      · {utilityTypeLabel(a.type)} · {a.accountNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === a.id ? null : a.id)}
                    aria-expanded={openId === a.id}
                    className="shrink-0 rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs font-medium text-[#B0B0C8] transition-colors hover:text-white"
                  >
                    {openId === a.id ? 'Hide Bills' : 'View Bills'}
                  </button>
                </div>
                {openId === a.id && <AccountBills accountId={a.id} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
