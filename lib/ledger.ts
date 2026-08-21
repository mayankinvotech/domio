import type { LedgerEntryType } from '@prisma/client';

// The transaction journal (LedgerEntry) stores a SIGNED amount: charges are
// negative, payments positive. This is the single source of truth for the sign
// convention — the client sends a magnitude, the server decides the sign here.
// (Previously the sign lived only in the client, and the API accepted any
// integer, so a mis-signed payment could silently corrupt every balance.)

export const LEDGER_ENTRY_TYPES: LedgerEntryType[] = [
  'RENT_CHARGE',
  'PAYMENT',
  'ADJUSTMENT',
];

export function isLedgerEntryType(v: unknown): v is LedgerEntryType {
  return (
    typeof v === 'string' &&
    LEDGER_ENTRY_TYPES.includes(v as LedgerEntryType)
  );
}

// Apply the sign convention. `magnitude` may arrive signed or unsigned:
//   RENT_CHARGE → always negative
//   PAYMENT     → always positive
//   ADJUSTMENT  → the caller's sign is meaningful (can raise or lower a balance)
// The sign is always derived from the RESULTING type, so changing an entry's
// type (e.g. PAYMENT → RENT_CHARGE) flips the stored sign even if the amount
// field is unchanged.
export function normalizeLedgerAmount(
  type: LedgerEntryType,
  magnitude: number,
): number {
  const abs = Math.abs(Math.round(magnitude));
  if (type === 'RENT_CHARGE') return -abs;
  if (type === 'PAYMENT') return abs;
  // ADJUSTMENT keeps the caller's sign.
  return Math.round(magnitude);
}

export type ParsedLedgerEntry = {
  type: LedgerEntryType;
  amount: number; // signed, already normalized
  date: Date;
  rentFor: Date | null; // rental period this entry is for
  description: string;
};

// Validate + normalize a ledger-entry payload. `partial` mode (for PATCH) makes
// every field optional and returns only the provided keys; full mode (for POST)
// requires them all. In partial mode, if `type` and/or `amount` is present the
// amount is re-signed against the resulting type — so callers must pass the
// existing type when only the amount changes, and the existing amount when only
// the type changes. The routes handle that merge before calling normalize.
export function parseLedgerEntryInput(
  body: unknown,
  opts: { partial: boolean; existingType?: LedgerEntryType },
): { data: Partial<ParsedLedgerEntry> } | { error: string } {
  const { type, amount, date, rentFor, description } = (body ?? {}) as Record<
    string,
    unknown
  >;
  const out: Partial<ParsedLedgerEntry> = {};

  const hasType = type !== undefined;
  if (hasType) {
    if (!isLedgerEntryType(type)) {
      return { error: 'A valid entry type is required.' };
    }
    out.type = type;
  } else if (!opts.partial) {
    return { error: 'A valid entry type is required.' };
  }

  const hasAmount = amount !== undefined;
  if (hasAmount) {
    const raw = typeof amount === 'number' ? amount : Number(amount);
    if (!Number.isFinite(raw) || !Number.isInteger(raw) || raw === 0) {
      return { error: 'A non-zero whole amount is required.' };
    }
    // Sign is applied against the effective type (new type if provided, else
    // the existing one the caller passed in).
    const effectiveType = out.type ?? opts.existingType;
    if (!effectiveType) {
      return { error: 'A valid entry type is required.' };
    }
    out.amount = normalizeLedgerAmount(effectiveType, raw);
  } else if (!opts.partial) {
    return { error: 'A non-zero whole amount is required.' };
  }

  const hasDate = date !== undefined;
  if (hasDate) {
    if (typeof date !== 'string' || !date.trim()) {
      return { error: 'A valid date is required.' };
    }
    const when = new Date(date);
    if (Number.isNaN(when.getTime())) {
      return { error: 'A valid date is required.' };
    }
    out.date = when;
  } else if (!opts.partial) {
    return { error: 'A date is required.' };
  }

  // `rentFor` is optional even on create; null clears it.
  if (rentFor !== undefined) {
    if (rentFor === null || rentFor === '') {
      out.rentFor = null;
    } else if (typeof rentFor === 'string' && rentFor.trim()) {
      const rf = new Date(rentFor);
      if (Number.isNaN(rf.getTime())) {
        return { error: 'A valid "rent for" date is required.' };
      }
      out.rentFor = rf;
    } else {
      return { error: 'A valid "rent for" date is required.' };
    }
  }

  const hasDesc = description !== undefined;
  if (hasDesc) {
    if (typeof description !== 'string' || !description.trim()) {
      return { error: 'A description is required.' };
    }
    out.description = description.trim();
  } else if (!opts.partial) {
    return { error: 'A description is required.' };
  }

  if (opts.partial && Object.keys(out).length === 0) {
    return { error: 'No fields to update.' };
  }

  return { data: out };
}
