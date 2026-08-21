import type { UtilityType, BillStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  isUtilityType,
  utilityTypeLabel,
  type UtilityLevel,
} from '@/lib/utility-types';
import { isPaymentMethod } from '@/lib/payment-method-types';

// ── Overdue detection ────────────────────────────────────────────────────────

// Flip UNPAID bills whose due date has passed to OVERDUE. Called on fetch.
export async function markOverdueBills(ownerId: string): Promise<void> {
  await prisma.utilityBill.updateMany({
    where: { ownerId, status: 'UNPAID', dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' },
  });
}

// ── Accounts ─────────────────────────────────────────────────────────────────

export type UtilityAccountListItem = {
  id: string;
  type: UtilityType;
  provider: string;
  accountNumber: string;
  notes: string | null;
  linkedLabel: string;
  billCount: number;
};

export type UtilityAccountFilters = {
  propertyId?: string;
  subPropertyId?: string;
  // Manager scope: restrict to accounts on these properties/units only.
  scope?: { propertyIds: string[]; subPropertyIds: string[] };
};

export async function listUtilityAccountsForOwner(
  ownerId: string,
  filters: UtilityAccountFilters = {},
): Promise<UtilityAccountListItem[]> {
  const rows = await prisma.utilityAccount.findMany({
    where: {
      ownerId,
      ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
      ...(filters.subPropertyId ? { subPropertyId: filters.subPropertyId } : {}),
      ...(filters.scope
        ? {
            OR: [
              { propertyId: { in: filters.scope.propertyIds } },
              { subPropertyId: { in: filters.scope.subPropertyIds } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      provider: true,
      accountNumber: true,
      notes: true,
      portfolio: { select: { name: true } },
      property: {
        select: { name: true, portfolio: { select: { name: true } } },
      },
      subProperty: {
        select: {
          name: true,
          property: {
            select: { name: true, portfolio: { select: { name: true } } },
          },
        },
      },
      _count: { select: { bills: true } },
    },
  });

  return rows.map((a) => {
    // Full path "Portfolio → Property → Unit", scoped to the account's level.
    let linkedLabel: string;
    if (a.subProperty) {
      linkedLabel = `${a.subProperty.property.portfolio.name} → ${a.subProperty.property.name} → ${a.subProperty.name}`;
    } else if (a.property) {
      linkedLabel = `${a.property.portfolio.name} → ${a.property.name}`;
    } else {
      linkedLabel = a.portfolio?.name ?? '—';
    }
    return {
      id: a.id,
      type: a.type,
      provider: a.provider,
      accountNumber: a.accountNumber,
      notes: a.notes,
      billCount: a._count.bills,
      linkedLabel,
    };
  });
}

export async function getOwnedUtilityAccount(id: string, ownerId: string) {
  const account = await prisma.utilityAccount.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      type: true,
      provider: true,
      accountNumber: true,
      notes: true,
      portfolioId: true,
      propertyId: true,
      subPropertyId: true,
    },
  });
  if (!account || account.ownerId !== ownerId) return null;
  return account;
}

export type ParsedUtilityAccount = {
  type: UtilityType;
  provider: string;
  accountNumber: string;
  notes: string | null;
};

export function parseUtilityAccountInput(
  body: unknown,
): { data: ParsedUtilityAccount } | { error: string } {
  const { type, provider, accountNumber, notes } = (body ?? {}) as Record<
    string,
    unknown
  >;
  if (!isUtilityType(type)) {
    return { error: 'A valid utility type is required.' };
  }
  if (typeof provider !== 'string' || !provider.trim()) {
    return { error: 'A provider is required.' };
  }
  if (typeof accountNumber !== 'string' || !accountNumber.trim()) {
    return { error: 'An account number is required.' };
  }
  return {
    data: {
      type,
      provider: provider.trim(),
      accountNumber: accountNumber.trim(),
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    },
  };
}

export type ResolvedUtilityTarget = {
  portfolioId: string | null;
  propertyId: string | null;
  subPropertyId: string | null;
};

export async function resolveUtilityTarget(
  ownerId: string,
  level: UtilityLevel,
  targetId: string,
): Promise<{ data: ResolvedUtilityTarget } | { error: string }> {
  if (level === 'PORTFOLIO') {
    const p = await prisma.portfolio.findUnique({
      where: { id: targetId },
      select: { ownerId: true },
    });
    if (!p || p.ownerId !== ownerId) return { error: 'Portfolio not found.' };
    return {
      data: { portfolioId: targetId, propertyId: null, subPropertyId: null },
    };
  }
  if (level === 'PROPERTY') {
    const p = await prisma.property.findUnique({
      where: { id: targetId },
      select: { ownerId: true },
    });
    if (!p || p.ownerId !== ownerId) return { error: 'Property not found.' };
    return {
      data: { portfolioId: null, propertyId: targetId, subPropertyId: null },
    };
  }
  const u = await prisma.subProperty.findUnique({
    where: { id: targetId },
    select: { ownerId: true },
  });
  if (!u || u.ownerId !== ownerId) return { error: 'Unit not found.' };
  return {
    data: { portfolioId: null, propertyId: null, subPropertyId: targetId },
  };
}

// ── Bills ────────────────────────────────────────────────────────────────────

export type UtilityBillListItem = {
  id: string;
  billDate: Date;
  dueDate: Date;
  amount: number;
  amountPaid: number;
  status: BillStatus;
  paymentMethod: PaymentMethod | null;
  accountLabel: string;
  propertyName: string;
  utilityAccountId: string;
};

export async function listRecentBillsForOwner(
  ownerId: string,
  opts: {
    limit?: number;
    utilityAccountId?: string;
    scope?: { propertyIds: string[]; subPropertyIds: string[] };
  } = {},
): Promise<UtilityBillListItem[]> {
  await markOverdueBills(ownerId);
  const rows = await prisma.utilityBill.findMany({
    where: {
      ownerId,
      ...(opts.utilityAccountId
        ? { utilityAccountId: opts.utilityAccountId }
        : {}),
      ...(opts.scope
        ? {
            utilityAccount: {
              OR: [
                { propertyId: { in: opts.scope.propertyIds } },
                { subPropertyId: { in: opts.scope.subPropertyIds } },
              ],
            },
          }
        : {}),
    },
    orderBy: { dueDate: 'desc' },
    take: opts.limit ?? 50,
    select: {
      id: true,
      billDate: true,
      dueDate: true,
      amount: true,
      amountPaid: true,
      status: true,
      paymentMethod: true,
      utilityAccountId: true,
      utilityAccount: {
        select: {
          type: true,
          provider: true,
          property: { select: { name: true } },
          subProperty: {
            select: { unitNumber: true, property: { select: { name: true } } },
          },
        },
      },
    },
  });
  return rows.map((b) => ({
    id: b.id,
    billDate: b.billDate,
    dueDate: b.dueDate,
    amount: b.amount,
    amountPaid: b.amountPaid,
    status: b.status,
    paymentMethod: b.paymentMethod,
    utilityAccountId: b.utilityAccountId,
    accountLabel: `${utilityTypeLabel(b.utilityAccount.type)} · ${b.utilityAccount.provider}`,
    propertyName: b.utilityAccount.subProperty
      ? `${b.utilityAccount.subProperty.property.name} · Unit ${b.utilityAccount.subProperty.unitNumber}`
      : (b.utilityAccount.property?.name ?? '—'),
  }));
}

export async function getOwnedUtilityBill(id: string, ownerId: string) {
  const bill = await prisma.utilityBill.findUnique({
    where: { id },
    select: { id: true, ownerId: true, amount: true },
  });
  if (!bill || bill.ownerId !== ownerId) return null;
  return bill;
}

export type ParsedBill = {
  billDate: Date;
  dueDate: Date;
  amount: number;
  notes: string | null;
};

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseBillInput(
  body: unknown,
): { data: ParsedBill } | { error: string } {
  const { billDate, dueDate, amount, notes } = (body ?? {}) as Record<
    string,
    unknown
  >;
  const bill = toDate(billDate);
  const due = toDate(dueDate);
  if (!bill) return { error: 'A valid bill date is required.' };
  if (!due) return { error: 'A valid due date is required.' };
  const amt = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { error: 'A valid amount is required.' };
  }
  return {
    data: {
      billDate: bill,
      dueDate: due,
      amount: amt,
      notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    },
  };
}

export type ParsedBillPayment = {
  amountPaid: number;
  paidDate: Date;
  paymentMethod: PaymentMethod | null;
};

export function parseBillPaymentInput(
  body: unknown,
): { data: ParsedBillPayment } | { error: string } {
  const { amountPaid, paymentDate, paymentMethod } = (body ?? {}) as Record<
    string,
    unknown
  >;
  const amt = typeof amountPaid === 'number' ? amountPaid : Number(amountPaid);
  if (!Number.isFinite(amt) || amt < 0) {
    return { error: 'A valid amount paid is required.' };
  }
  const paid = toDate(paymentDate);
  if (!paid) return { error: 'A valid payment date is required.' };
  return {
    data: {
      amountPaid: amt,
      paidDate: paid,
      paymentMethod: isPaymentMethod(paymentMethod) ? paymentMethod : null,
    },
  };
}

// ── Summary ──────────────────────────────────────────────────────────────────

export type UtilitySummary = {
  unpaidCount: number;
  overdueCount: number;
  amountOutstanding: number;
};

export async function getUtilitySummary(
  ownerId: string,
  scope?: { propertyIds: string[]; subPropertyIds: string[] },
): Promise<UtilitySummary> {
  await markOverdueBills(ownerId);
  const s = scope
    ? {
        utilityAccount: {
          OR: [
            { propertyId: { in: scope.propertyIds } },
            { subPropertyId: { in: scope.subPropertyIds } },
          ],
        },
      }
    : {};
  const unpaidWhere = {
    ownerId,
    status: { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] as BillStatus[] },
    ...s,
  };
  const [unpaidCount, overdueCount, agg] = await Promise.all([
    prisma.utilityBill.count({ where: unpaidWhere }),
    prisma.utilityBill.count({ where: { ownerId, status: 'OVERDUE', ...s } }),
    prisma.utilityBill.aggregate({
      _sum: { amount: true, amountPaid: true },
      where: unpaidWhere,
    }),
  ]);
  return {
    unpaidCount,
    overdueCount,
    amountOutstanding: (agg._sum.amount ?? 0) - (agg._sum.amountPaid ?? 0),
  };
}
