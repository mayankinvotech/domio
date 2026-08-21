import type { RentStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isRentStatus } from '@/lib/rent-types';
import { isPaymentMethod } from '@/lib/payment-method-types';

// ── Ledger schedule generation ──────────────────────────────────────────────

// One row per calendar month from start to end (inclusive), due on the given
// day-of-month (clamped to the month length). Pure — used inside the tenancy
// creation transaction.
export function buildLedgerSchedule(
  start: Date,
  end: Date,
  paymentDay: number,
  monthlyRent: number,
): { dueDate: Date; amountDue: number }[] {
  const rows: { dueDate: Date; amountDue: number }[] = [];
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  const endY = end.getUTCFullYear();
  const endM = end.getUTCMonth();

  // Guard against runaway loops on bad input.
  let guard = 0;
  while ((y < endY || (y === endY && m <= endM)) && guard < 600) {
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const day = Math.min(paymentDay, daysInMonth);
    rows.push({ dueDate: new Date(Date.UTC(y, m, day)), amountDue: monthlyRent });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    guard += 1;
  }
  return rows;
}

// ── Listing ─────────────────────────────────────────────────────────────────

export type RentLedgerItem = {
  id: string;
  dueDate: Date;
  monthlyRent: number;
  amountDue: number;
  amountPaid: number;
  paidDate: Date | null;
  rentFor: Date | null;
  reference: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
  status: RentStatus;
  tenantName: string;
  unitName: string;
  unitNumber: string;
  subPropertyId: string | null;
  propertyId: string;
  propertyName: string;
};

export type RentLedgerFilters = {
  status?: string;
  propertyId?: string;
  subPropertyId?: string;
  // Manager scope: restrict to ledger entries for these units only.
  subPropertyIds?: string[];
  month?: string; // "YYYY-MM"
};

function monthRange(month?: string): { start: Date; end: Date } | null {
  if (!month) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  if (m < 0 || m > 11) return null;
  return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 1)) };
}

export async function listRentLedgerForOwner(
  ownerId: string,
  filters: RentLedgerFilters = {},
): Promise<RentLedgerItem[]> {
  const range = monthRange(filters.month);
  // Combine property/unit filters under a single `tenancy` clause.
  const tenancyFilter: {
    subPropertyId?: string | { in: string[] };
    subProperty?: { propertyId: string };
  } = {};
  if (filters.subPropertyId) tenancyFilter.subPropertyId = filters.subPropertyId;
  else if (filters.subPropertyIds) {
    tenancyFilter.subPropertyId = { in: filters.subPropertyIds };
  }
  if (filters.propertyId) {
    tenancyFilter.subProperty = { propertyId: filters.propertyId };
  }

  const rows = await prisma.rentLedger.findMany({
    where: {
      ownerId,
      ...(isRentStatus(filters.status) ? { status: filters.status } : {}),
      ...(Object.keys(tenancyFilter).length ? { tenancy: tenancyFilter } : {}),
      ...(range ? { dueDate: { gte: range.start, lt: range.end } } : {}),
    },
    orderBy: [{ dueDate: 'asc' }],
    select: {
      id: true,
      dueDate: true,
      amountDue: true,
      amountPaid: true,
      paidDate: true,
      rentFor: true,
      reference: true,
      notes: true,
      paymentMethod: true,
      status: true,
      tenancy: {
        select: {
          monthlyRent: true,
          subPropertyId: true,
          tenant: { select: { name: true } },
          subProperty: {
            select: {
              name: true,
              unitNumber: true,
              propertyId: true,
              property: { select: { name: true } },
            },
          },
          rentableEntity: {
            select: {
              name: true,
              code: true,
              propertyId: true,
              property: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    dueDate: r.dueDate,
    monthlyRent: r.tenancy.monthlyRent,
    amountDue: r.amountDue,
    amountPaid: r.amountPaid,
    paidDate: r.paidDate,
    rentFor: r.rentFor,
    reference: r.reference,
    notes: r.notes,
    paymentMethod: r.paymentMethod,
    status: r.status,
    tenantName: r.tenancy.tenant.name,
    unitName: r.tenancy.subProperty?.name ?? r.tenancy.rentableEntity?.name ?? 'Unit',
    unitNumber: r.tenancy.subProperty?.unitNumber ?? r.tenancy.rentableEntity?.code ?? '—',
    subPropertyId: r.tenancy.subPropertyId ?? null,
    propertyId: r.tenancy.subProperty?.propertyId ?? r.tenancy.rentableEntity?.propertyId ?? '',
    propertyName: r.tenancy.subProperty?.property?.name ?? r.tenancy.rentableEntity?.property?.name ?? '',
  }));
}

// ── Status computation ───────────────────────────────────────────────────────

// The single source of truth for a RentLedger row's status. Used by both the
// /pay route and the generic PATCH so edits recompute consistently — raising
// amountDue above amountPaid flips PAID → PARTIAL, zeroing amountPaid returns a
// row to DUE/OVERDUE by its due date. A due date equal to today is NOT overdue.
export function computeRentStatus(args: {
  amountDue: number;
  amountPaid: number;
  dueDate: Date;
  now?: Date;
}): RentStatus {
  if (args.amountDue > 0 && args.amountPaid >= args.amountDue) return 'PAID';
  if (args.amountPaid > 0) return 'PARTIAL';
  const now = args.now ?? new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return args.dueDate < todayStart ? 'OVERDUE' : 'DUE';
}

// ── Active tenancy options (for the manual "Add Rent Entry" dropdown) ────────

export type ActiveTenancyOption = {
  tenancyId: string;
  label: string;
  monthlyRent: number;
};

export async function listActiveTenancyOptions(
  ownerId: string,
  scope?: { subPropertyIds: string[] },
): Promise<ActiveTenancyOption[]> {
  const rows = await prisma.tenancy.findMany({
    where: {
      ownerId,
      status: 'ACTIVE',
      ...(scope ? { subPropertyId: { in: scope.subPropertyIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      monthlyRent: true,
      tenant: { select: { name: true } },
      subProperty: {
        select: { unitNumber: true, property: { select: { name: true } } },
      },
      rentableEntity: {
        select: { code: true, property: { select: { name: true } } },
      },
    },
  });
  return rows.map((t) => {
    const unitLabel = t.subProperty?.unitNumber ?? t.rentableEntity?.code ?? '—';
    const propName = t.subProperty?.property?.name ?? t.rentableEntity?.property?.name ?? '';
    return {
      tenancyId: t.id,
      monthlyRent: t.monthlyRent,
      label: `${t.tenant.name} — Unit ${unitLabel} (${propName})`,
    };
  });
}

// ── Summary (current month) ─────────────────────────────────────────────────

export type RentSummary = {
  dueThisMonth: number;
  collectedThisMonth: number;
  overdue: number;
};

export async function getRentSummary(
  ownerId: string,
  scope?: { subPropertyIds: string[] },
): Promise<RentSummary> {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  // Start of today (UTC midnight) — a due date equal to today is NOT yet overdue.
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const s = scope
    ? { tenancy: { subPropertyId: { in: scope.subPropertyIds } } }
    : {};

  const [due, collected, overdue] = await Promise.all([
    // Due this month: current month AND already due (dueDate <= now).
    prisma.rentLedger.aggregate({
      _sum: { amountDue: true },
      where: { ownerId, dueDate: { gte: start, lte: now, lt: end }, ...s },
    }),
    prisma.rentLedger.aggregate({
      _sum: { amountPaid: true },
      where: { ownerId, paidDate: { gte: start, lt: end }, ...s },
    }),
    // Overdue: strictly past due date and flagged OVERDUE.
    prisma.rentLedger.aggregate({
      _sum: { amountDue: true, amountPaid: true },
      where: { ownerId, status: 'OVERDUE', dueDate: { lt: todayStart }, ...s },
    }),
  ]);

  return {
    dueThisMonth: due._sum.amountDue ?? 0,
    collectedThisMonth: collected._sum.amountPaid ?? 0,
    overdue: (overdue._sum.amountDue ?? 0) - (overdue._sum.amountPaid ?? 0),
  };
}

// ── Payment ─────────────────────────────────────────────────────────────────

export async function getOwnedLedgerEntry(id: string, ownerId: string) {
  const entry = await prisma.rentLedger.findUnique({
    where: { id },
    select: { id: true, ownerId: true, amountDue: true },
  });
  if (!entry || entry.ownerId !== ownerId) return null;
  return entry;
}

// The RentLedger fields we audit + everything a mutation route needs (context
// ids for the audit row). Used by the generic PATCH/DELETE routes.
export const RENT_LEDGER_MUTABLE_SELECT = {
  id: true,
  ownerId: true,
  tenancyId: true,
  dueDate: true,
  amountDue: true,
  amountPaid: true,
  paidDate: true,
  rentFor: true,
  reference: true,
  notes: true,
  paymentMethod: true,
  status: true,
  tenancy: { select: { subPropertyId: true } },
} as const;

export type ParsedRentLedgerPatch = {
  dueDate?: Date;
  amountDue?: number;
  amountPaid?: number;
  paidDate?: Date | null;
  rentFor?: Date | null;
  reference?: string | null;
  notes?: string | null;
  paymentMethod?: PaymentMethod | null;
  status?: RentStatus;
};

// Validate a partial RentLedger update. Every field is optional; only provided
// keys appear in the result. `status` is accepted as an explicit override but
// the route recomputes it from the merged amounts unless the caller passes it.
export function parseRentLedgerPatch(
  body: unknown,
): { data: ParsedRentLedgerPatch } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: ParsedRentLedgerPatch = {};

  if (b.dueDate !== undefined) {
    if (typeof b.dueDate !== 'string' || !b.dueDate.trim()) {
      return { error: 'A valid due date is required.' };
    }
    const d = new Date(b.dueDate);
    if (Number.isNaN(d.getTime())) return { error: 'A valid due date is required.' };
    out.dueDate = d;
  }
  if (b.amountDue !== undefined) {
    const n = typeof b.amountDue === 'number' ? b.amountDue : Number(b.amountDue);
    if (!Number.isFinite(n) || n <= 0) {
      return { error: 'A valid amount due is required.' };
    }
    out.amountDue = n;
  }
  if (b.amountPaid !== undefined) {
    const n = typeof b.amountPaid === 'number' ? b.amountPaid : Number(b.amountPaid);
    if (!Number.isFinite(n) || n < 0) {
      return { error: 'A valid amount paid is required.' };
    }
    out.amountPaid = n;
  }
  if (b.paymentDate !== undefined || b.paidDate !== undefined) {
    const raw = (b.paymentDate ?? b.paidDate) as unknown;
    if (raw === null || raw === '') {
      out.paidDate = null;
    } else if (typeof raw === 'string' && raw.trim()) {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return { error: 'A valid payment date is required.' };
      out.paidDate = d;
    } else {
      return { error: 'A valid payment date is required.' };
    }
  }
  if (b.rentFor !== undefined) {
    if (b.rentFor === null || b.rentFor === '') {
      out.rentFor = null;
    } else if (typeof b.rentFor === 'string' && b.rentFor.trim()) {
      const rf = new Date(b.rentFor);
      if (Number.isNaN(rf.getTime())) {
        return { error: 'A valid "rent for" date is required.' };
      }
      out.rentFor = rf;
    } else {
      return { error: 'A valid "rent for" date is required.' };
    }
  }
  if (b.reference !== undefined) {
    out.reference =
      typeof b.reference === 'string' && b.reference.trim()
        ? b.reference.trim()
        : null;
  }
  if (b.notes !== undefined) {
    out.notes =
      typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim() : null;
  }
  if (b.paymentMethod !== undefined) {
    out.paymentMethod = isPaymentMethod(b.paymentMethod) ? b.paymentMethod : null;
  }
  if (b.status !== undefined) {
    if (!isRentStatus(b.status)) return { error: 'A valid status is required.' };
    out.status = b.status;
  }

  if (Object.keys(out).length === 0) return { error: 'No fields to update.' };
  return { data: out };
}

export type ParsedPayment = {
  amountPaid: number;
  paidDate: Date;
  rentFor: Date | null;
  reference: string | null;
  notes: string | null;
  paymentMethod: PaymentMethod | null;
};

export function parsePaymentInput(
  body: unknown,
): { data: ParsedPayment } | { error: string } {
  const { amountPaid, paymentDate, rentFor, reference, notes, paymentMethod } =
    (body ?? {}) as Record<string, unknown>;

  const amount =
    typeof amountPaid === 'number' ? amountPaid : Number(amountPaid);
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: 'A valid amount paid is required.' };
  }

  if (typeof paymentDate !== 'string' || !paymentDate.trim()) {
    return { error: 'A payment date is required.' };
  }
  const paidDate = new Date(paymentDate);
  if (Number.isNaN(paidDate.getTime())) {
    return { error: 'A valid payment date is required.' };
  }

  // "Rent for" defaults to the payment date when omitted.
  let rentForDate: Date | null = paidDate;
  if (rentFor !== undefined) {
    if (rentFor === null || rentFor === '') {
      rentForDate = null;
    } else if (typeof rentFor === 'string' && rentFor.trim()) {
      const rf = new Date(rentFor);
      if (Number.isNaN(rf.getTime())) {
        return { error: 'A valid "rent for" date is required.' };
      }
      rentForDate = rf;
    } else {
      return { error: 'A valid "rent for" date is required.' };
    }
  }

  return {
    data: {
      amountPaid: amount,
      paidDate,
      rentFor: rentForDate,
      reference:
        typeof reference === 'string' && reference.trim()
          ? reference.trim()
          : null,
      notes:
        typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      paymentMethod: isPaymentMethod(paymentMethod) ? paymentMethod : null,
    },
  };
}
