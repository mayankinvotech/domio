import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { recordAudit, type AuditActor } from '@/lib/audit';
import { normalizeLedgerAmount } from '@/lib/ledger';
import { resolveRentLedgerAccess } from '@/lib/manager-access';

// ── Tool definitions (sent to Claude) ───────────────────────────────────────
export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_all_balances',
    description: "Get current balance for all tenants across owner's properties.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_tenant_balance',
    description:
      'Get detailed balance and recent ledger entries for a specific tenant.',
    input_schema: {
      type: 'object',
      properties: { tenantName: { type: 'string' } },
      required: ['tenantName'],
    },
  },
  {
    name: 'get_overdue_tenants',
    description:
      'Get list of all tenants with outstanding dues (negative balance).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_monthly_summary',
    description: 'Get rent collection summary for a specific month.',
    input_schema: {
      type: 'object',
      properties: {
        month: { type: 'number', description: '1-12' },
        year: { type: 'number' },
      },
      required: ['month', 'year'],
    },
  },
  {
    name: 'create_payment',
    description:
      'Record a rent payment from a tenant. Always show confirmation to user before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        tenantName: { type: 'string' },
        amount: { type: 'number', description: 'Positive INR amount' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        description: { type: 'string' },
      },
      required: ['tenantName', 'amount', 'date', 'description'],
    },
  },
  {
    name: 'create_charge',
    description:
      'Create a rent charge for a tenant. Always show confirmation to user before calling this.',
    input_schema: {
      type: 'object',
      properties: {
        tenantName: { type: 'string' },
        amount: { type: 'number', description: 'Positive INR amount (stored as a debit)' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        description: { type: 'string' },
      },
      required: ['tenantName', 'amount', 'date', 'description'],
    },
  },
];

// Tools that mutate data — the API route pauses on these for user confirmation.
export const WRITE_TOOLS = new Set(['create_payment', 'create_charge']);

// ── Shared helpers ──────────────────────────────────────────────────────────
type LedgerLite = { type: string; amount: number; date: Date };

const balanceOf = (entries: LedgerLite[]) =>
  entries.reduce((s, e) => s + e.amount, 0);

const lastPaymentDate = (entries: LedgerLite[]): string | null => {
  const pays = entries
    .filter((e) => e.type === 'PAYMENT')
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  return pays.length ? pays[0].date.toISOString().slice(0, 10) : null;
};

async function findTenancyFuzzy(
  ownerId: string,
  tenantName: string,
  // When provided, restrict the search to these units (manager read scope).
  subPropertyIds?: string[],
) {
  const q = tenantName.trim().toLowerCase();
  const tenancies = await prisma.tenancy.findMany({
    where: {
      ownerId,
      status: 'ACTIVE',
      ...(subPropertyIds ? { subPropertyId: { in: subPropertyIds } } : {}),
    },
    select: {
      id: true,
      monthlyRent: true,
      subPropertyId: true,
      rentableEntityId: true,
      tenant: { select: { name: true } },
      subProperty: { select: { name: true } },
      rentableEntity: { select: { name: true } },
      ledgerEntries: { select: { type: true, amount: true, date: true } },
    },
  });
  // Exact (case-insensitive) first, then partial contains.
  return (
    tenancies.find((t) => t.tenant.name.toLowerCase() === q) ??
    tenancies.find((t) => t.tenant.name.toLowerCase().includes(q)) ??
    tenancies.find((t) => q.includes(t.tenant.name.toLowerCase().split(' ')[0])) ??
    null
  );
}

// ── Tool runner ─────────────────────────────────────────────────────────────
// Returns a JSON-serialisable result. `ownerId` scopes every query to the
// logged-in owner's data.
export async function runTool(
  name: string,
  input: Record<string, unknown>,
  ownerId: string,
  actor?: AuditActor,
  // Manager read scope: when set, read tools only see these units. Undefined =
  // full portfolio read (owner, or a manager with aiFullPortfolioRead).
  readSubPropertyIds?: string[],
): Promise<unknown> {
  // Applied to every read query's tenancy filter.
  const readScope = readSubPropertyIds
    ? { subPropertyId: { in: readSubPropertyIds } }
    : {};
  switch (name) {
    case 'get_all_balances': {
      const tenancies = await prisma.tenancy.findMany({
        where: { ownerId, status: 'ACTIVE', ...readScope },
        select: {
          monthlyRent: true,
          tenant: { select: { name: true } },
          subProperty: { select: { name: true } },
          rentableEntity: { select: { name: true } },
          ledgerEntries: { select: { type: true, amount: true, date: true } },
        },
      });
      const rows = tenancies.map((t) => ({
        tenantName: t.tenant.name,
        unitName: t.subProperty?.name ?? t.rentableEntity?.name ?? 'Unit',
        monthlyRent: t.monthlyRent,
        currentBalance: balanceOf(t.ledgerEntries),
        lastPaymentDate: lastPaymentDate(t.ledgerEntries),
      }));
      rows.sort((a, b) => a.currentBalance - b.currentBalance);
      return { count: rows.length, tenants: rows };
    }

    case 'get_tenant_balance': {
      const t = await findTenancyFuzzy(
        ownerId,
        String(input.tenantName ?? ''),
        readSubPropertyIds,
      );
      if (!t) return { error: `No active tenant found matching "${input.tenantName}".` };
      const recent = [...t.ledgerEntries]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10)
        .map((e) => ({
          date: e.date.toISOString().slice(0, 10),
          type: e.type,
          amount: e.amount,
        }));
      return {
        tenantName: t.tenant.name,
        unitName: t.subProperty?.name ?? t.rentableEntity?.name ?? 'Unit',
        monthlyRent: t.monthlyRent,
        currentBalance: balanceOf(t.ledgerEntries),
        lastPaymentDate: lastPaymentDate(t.ledgerEntries),
        recentEntries: recent,
      };
    }

    case 'get_overdue_tenants': {
      const tenancies = await prisma.tenancy.findMany({
        where: { ownerId, status: 'ACTIVE', ...readScope },
        select: {
          monthlyRent: true,
          tenant: { select: { name: true } },
          subProperty: { select: { name: true } },
          rentableEntity: { select: { name: true } },
          ledgerEntries: { select: { type: true, amount: true, date: true } },
        },
      });
      const overdue = tenancies
        .map((t) => {
          const currentBalance = balanceOf(t.ledgerEntries);
          return {
            tenantName: t.tenant.name,
            unitName: t.subProperty?.name ?? t.rentableEntity?.name ?? 'Unit',
            currentBalance,
            monthsOverdueEstimate:
              t.monthlyRent > 0 && currentBalance < 0
                ? Math.ceil(Math.abs(currentBalance) / t.monthlyRent)
                : 0,
          };
        })
        .filter((t) => t.currentBalance < 0)
        .sort((a, b) => a.currentBalance - b.currentBalance);
      return { count: overdue.length, tenants: overdue };
    }

    case 'get_monthly_summary': {
      const month = Number(input.month);
      const year = Number(input.year);
      if (!month || month < 1 || month > 12 || !year) {
        return { error: 'Provide a valid month (1-12) and year.' };
      }
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          tenancy: { ownerId, ...readScope },
          date: { gte: start, lt: end },
        },
        select: {
          type: true,
          amount: true,
          tenancy: { select: { tenant: { select: { name: true } } } },
        },
      });
      const totalCharged = entries
        .filter((e) => e.type === 'RENT_CHARGE')
        .reduce((s, e) => s + Math.abs(e.amount), 0);
      const totalCollected = entries
        .filter((e) => e.type === 'PAYMENT')
        .reduce((s, e) => s + e.amount, 0);

      // Unpaid = active tenants whose overall balance is still negative.
      const all = await prisma.tenancy.findMany({
        where: { ownerId, status: 'ACTIVE', ...readScope },
        select: {
          tenant: { select: { name: true } },
          ledgerEntries: { select: { amount: true } },
        },
      });
      const unpaidTenants = all
        .map((t) => ({
          tenantName: t.tenant.name,
          currentBalance: t.ledgerEntries.reduce((s, e) => s + e.amount, 0),
        }))
        .filter((t) => t.currentBalance < 0)
        .sort((a, b) => a.currentBalance - b.currentBalance);

      return {
        month,
        year,
        totalCharged,
        totalCollected,
        collectionRate:
          totalCharged > 0
            ? Math.round((totalCollected / totalCharged) * 100)
            : null,
        unpaidTenants,
      };
    }

    case 'create_payment':
    case 'create_charge': {
      const t = await findTenancyFuzzy(ownerId, String(input.tenantName ?? ''));
      if (!t) return { error: `No active tenant found matching "${input.tenantName}".` };

      // Ask Domi is not a permission bypass: enforce the same per-unit
      // rent-ledger rights as the UI and the API. Owners pass; a manager must
      // have canEditRentLedger on this unit.
      if (!actor) {
        return { error: 'This action requires an authenticated user.' };
      }
      const acc = await resolveRentLedgerAccess(actor, {
        subPropertyId: t.subPropertyId ?? undefined,
      });
      if ('error' in acc || acc.ownerId !== ownerId) {
        return {
          error: `You don't have rent-ledger edit rights for ${t.tenant.name}'s unit.`,
        };
      }

      const magnitude = Math.round(Math.abs(Number(input.amount)));
      if (!Number.isFinite(magnitude) || magnitude <= 0) {
        return { error: 'A positive amount is required.' };
      }
      const when = new Date(String(input.date));
      if (Number.isNaN(when.getTime())) return { error: 'A valid date (YYYY-MM-DD) is required.' };
      const description = String(input.description ?? '').trim();
      if (!description) return { error: 'A description is required.' };

      const isPayment = name === 'create_payment';
      const type = isPayment ? 'PAYMENT' : 'RENT_CHARGE';
      const signedAmount = normalizeLedgerAmount(type, magnitude);
      await prisma.$transaction(async (tx) => {
        const created = await tx.ledgerEntry.create({
          data: {
            tenancyId: t.id,
            type,
            amount: signedAmount,
            date: when,
            description,
            createdById: actor?.id ?? null,
            updatedById: actor?.id ?? null,
          },
          select: { id: true, type: true, amount: true, date: true, description: true },
        });
        // Attribute AI-driven writes to the invoking user, flagged "via Ask Domi".
        if (actor) {
          await recordAudit(tx, {
            entity: 'LEDGER_ENTRY',
            entityId: created.id,
            action: 'CREATE',
            actor,
            ctx: { ownerId, subPropertyId: t.subPropertyId ?? '', tenancyId: t.id },
            before: null,
            after: created,
            reason: 'via Ask Domi',
          });
        }
      });
      const newBalance = balanceOf(t.ledgerEntries) + signedAmount;
      return {
        success: true,
        action: isPayment ? 'payment' : 'charge',
        tenantName: t.tenant.name,
        unitName: t.subProperty?.name ?? t.rentableEntity?.name ?? 'Unit',
        amount: signedAmount,
        date: when.toISOString().slice(0, 10),
        description,
        newBalance,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
