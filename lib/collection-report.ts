import { prisma } from '@/lib/prisma';

// Consolidated collection report: columns are properties OR units, the Apr→Mar
// financial year is the rows, payments received per cell. Reads the LedgerEntry
// transaction journal (where rent payments actually live), consistent with the
// rent statement and dashboard.

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export type CollectionLevel = 'property' | 'unit';

export type CollectionColumn = {
  id: string;
  label: string;
  sublabel?: string;
  propertyId?: string; // for the Collection Tracker filters (unit level)
  portfolioId?: string;
};

export type CollectionFilter = {
  portfolioId?: string;
  propertyId?: string;
  unitId?: string;
};

export type CollectionMatrix = {
  by: CollectionLevel;
  fyStartYear: number;
  fyLabel: string; // "FY 2026-27"
  months: { key: string; label: string }[]; // Apr..Mar, in FY order
  columns: CollectionColumn[]; // properties or units
  received: Record<string, Record<string, number>>; // colId → monthKey → amount
  notes: Record<string, Record<string, string>>; // colId → monthKey → payment descriptions
  openingByColumn: Record<string, number>; // owed carried in from before this FY
  dueByColumn: Record<string, number>; // current outstanding per column
  totalByColumn: Record<string, number>; // FY received per column
  totalByMonth: Record<string, number>; // received per month (row totals)
  grandOpening: number;
  grandReceived: number;
  grandDue: number;
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// The financial year (Apr→Mar) that contains `now`.
export function currentFyStartYear(now = new Date()): number {
  const cy = now.getUTCFullYear();
  const cm = now.getUTCMonth();
  return cm >= 3 ? cy : cy - 1;
}

export async function getCollectionMatrix(
  ownerId: string,
  fyStartYear: number,
  by: CollectionLevel = 'unit',
  scope?: { propertyIds: string[]; subPropertyIds: string[] },
): Promise<CollectionMatrix> {
  const fyStart = new Date(Date.UTC(fyStartYear, 3, 1));
  const fyEnd = new Date(Date.UTC(fyStartYear + 1, 3, 1));
  const subScope = scope ? { subPropertyId: { in: scope.subPropertyIds } } : {};

  // Columns.
  let columns: CollectionColumn[];
  if (by === 'property') {
    const props = await prisma.property.findMany({
      where: { ownerId, ...(scope ? { id: { in: scope.propertyIds } } : {}) },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    columns = props.map((p) => ({ id: p.id, label: p.name }));
  } else {
    const units = await prisma.subProperty.findMany({
      where: { ownerId, ...(scope ? { id: { in: scope.subPropertyIds } } : {}) },
      orderBy: [{ property: { name: 'asc' } }, { unitNumber: 'asc' }],
      select: {
        id: true,
        name: true,
        unitNumber: true,
        propertyId: true,
        property: { select: { name: true, portfolioId: true } },
        // The current occupant, to show alongside the unit.
        tenancies: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
          select: { tenant: { select: { name: true } } },
        },
      },
    });
    columns = units.map((u) => {
      const tenant = u.tenancies[0]?.tenant.name;
      return {
        id: u.id,
        label: `Unit ${u.unitNumber}`,
        sublabel: tenant ? `${tenant} · ${u.property.name}` : u.property.name,
        propertyId: u.propertyId,
        portfolioId: u.property.portfolioId,
      };
    });
  }
  const known = new Set(columns.map((c) => c.id));
  // Which id on a payment/tenancy maps to a column.
  const colOf = (t: { subPropertyId: string; propertyId: string }) =>
    by === 'property' ? t.propertyId : t.subPropertyId;

  // Month columns, in FY order: Apr..Dec of fyStartYear, then Jan..Mar of +1.
  const months: { key: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = (3 + i) % 12;
    const y = i < 9 ? fyStartYear : fyStartYear + 1;
    months.push({ key: `${y}-${m}`, label: `${MONTH_ABBR[m]} ${y}` });
  }

  // Payments received in the FY (by payment date), per column + month.
  const payments = await prisma.ledgerEntry.findMany({
    where: {
      type: 'PAYMENT',
      date: { gte: fyStart, lt: fyEnd },
      tenancy: { ownerId, ...subScope },
    },
    orderBy: { date: 'asc' },
    select: {
      amount: true,
      date: true,
      description: true,
      tenancy: {
        select: {
          subPropertyId: true,
          subProperty: { select: { propertyId: true } },
          rentableEntity: { select: { propertyId: true } },
        },
      },
    },
  });

  const received: Record<string, Record<string, number>> = {};
  const noteLines: Record<string, Record<string, string[]>> = {};
  const totalByColumn: Record<string, number> = {};
  const totalByMonth: Record<string, number> = {};
  let grandReceived = 0;
  for (const c of columns) received[c.id] = {};
  for (const e of payments) {
    const subId = e.tenancy.subPropertyId ?? '';
    const propId = e.tenancy.subProperty?.propertyId ?? e.tenancy.rentableEntity?.propertyId ?? '';
    const colId = colOf({
      subPropertyId: subId,
      propertyId: propId,
    });
    if (!known.has(colId)) continue;
    const key = `${e.date.getUTCFullYear()}-${e.date.getUTCMonth()}`;
    received[colId][key] = (received[colId][key] ?? 0) + e.amount;
    totalByColumn[colId] = (totalByColumn[colId] ?? 0) + e.amount;
    totalByMonth[key] = (totalByMonth[key] ?? 0) + e.amount;
    grandReceived += e.amount;
    ((noteLines[colId] ??= {})[key] ??= []).push(
      `${e.date.toISOString().slice(0, 10)} · ${inr(e.amount)} — ${e.description}`,
    );
  }
  // Join each cell's payment lines into a hover tooltip.
  const notes: Record<string, Record<string, string>> = {};
  for (const [colId, byMonth] of Object.entries(noteLines)) {
    notes[colId] = {};
    for (const [k, lines] of Object.entries(byMonth)) {
      notes[colId][k] = lines.join('\n');
    }
  }

  // Current outstanding per column: sum of negative tenancy balances
  // (balance = SUM(all LedgerEntry.amount); negative = tenant owes).
  const [balances, opening, tenancies] = await Promise.all([
    prisma.ledgerEntry.groupBy({
      by: ['tenancyId'],
      where: { tenancy: { ownerId, ...subScope } },
      _sum: { amount: true },
    }),
    // Balance carried in from before this FY (opening position at Apr 1).
    prisma.ledgerEntry.groupBy({
      by: ['tenancyId'],
      where: { tenancy: { ownerId, ...subScope }, date: { lt: fyStart } },
      _sum: { amount: true },
    }),
    prisma.tenancy.findMany({
      where: { ownerId, ...subScope },
      select: {
        id: true,
        subPropertyId: true,
        subProperty: { select: { propertyId: true } },
        rentableEntity: { select: { propertyId: true } },
      },
    }),
  ]);
  const tenancyToCol = new Map(
    tenancies.map((t) => [
      t.id,
      colOf({
        subPropertyId: t.subPropertyId ?? '',
        propertyId: t.subProperty?.propertyId ?? t.rentableEntity?.propertyId ?? '',
      }),
    ]),
  );

  // Sum the negative (owed) per-tenancy balances into each column.
  const sumOwed = (
    rows: { tenancyId: string; _sum: { amount: number | null } }[],
  ): { byColumn: Record<string, number>; grand: number } => {
    const byColumn: Record<string, number> = {};
    let grand = 0;
    for (const b of rows) {
      const bal = b._sum.amount ?? 0;
      if (bal >= 0) continue; // settled or in credit
      const colId = tenancyToCol.get(b.tenancyId);
      if (!colId || !known.has(colId)) continue;
      byColumn[colId] = (byColumn[colId] ?? 0) - bal;
      grand += -bal;
    }
    return { byColumn, grand };
  };
  const { byColumn: dueByColumn, grand: grandDue } = sumOwed(balances);
  const { byColumn: openingByColumn, grand: grandOpening } = sumOwed(opening);

  return {
    by,
    fyStartYear,
    fyLabel: `FY ${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, '0')}`,
    months,
    columns,
    received,
    notes,
    openingByColumn,
    dueByColumn,
    totalByColumn,
    totalByMonth,
    grandOpening,
    grandReceived,
    grandDue,
  };
}

// Narrow a unit-level matrix to a portfolio / property / unit, recomputing all
// totals from the retained columns. Pure — shared by the Collection Tracker UI
// (live filtering + CSV) and the PDF route so both stay in lockstep.
export function applyCollectionFilter(
  m: CollectionMatrix,
  f: CollectionFilter,
): CollectionMatrix {
  const columns = m.columns.filter(
    (c) =>
      (!f.portfolioId || c.portfolioId === f.portfolioId) &&
      (!f.propertyId || c.propertyId === f.propertyId) &&
      (!f.unitId || c.id === f.unitId),
  );
  const keep = new Set(columns.map((c) => c.id));
  const pick = <T,>(rec: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(rec).filter(([k]) => keep.has(k)));

  const received = pick(m.received);
  const notes = pick(m.notes);
  const openingByColumn = pick(m.openingByColumn);
  const dueByColumn = pick(m.dueByColumn);
  const totalByColumn = pick(m.totalByColumn);

  const totalByMonth: Record<string, number> = {};
  for (const c of columns) {
    for (const [k, v] of Object.entries(received[c.id] ?? {})) {
      totalByMonth[k] = (totalByMonth[k] ?? 0) + v;
    }
  }
  const sum = (rec: Record<string, number>) =>
    Object.values(rec).reduce((a, b) => a + b, 0);

  return {
    ...m,
    columns,
    received,
    notes,
    openingByColumn,
    dueByColumn,
    totalByColumn,
    totalByMonth,
    grandOpening: sum(openingByColumn),
    grandReceived: sum(totalByColumn),
    grandDue: sum(dueByColumn),
  };
}
