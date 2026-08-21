import type {
  PortfolioType,
  PropertyType,
  PropertyStatus,
  SubPropertyStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getMonthlyExpenseByPortfolio } from '@/lib/expenses';

export type TreeUnit = {
  id: string;
  name: string;
  unitNumber: string;
  floor: string | null;
  areaSqft: number | null;
  rentAmount: number;
  status: SubPropertyStatus;
  notes: string | null;
  currentTenantName: string | null;
  outstanding: number;
  lastPaymentDate: Date | null;
};

export type TreeProperty = {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  type: PropertyType;
  status: PropertyStatus;
  notes: string | null;
  createdAt: Date;
  utilityAccountCount: number;
  units: TreeUnit[];
};

export type TreePortfolio = {
  id: string;
  name: string;
  type: PortfolioType;
  description: string | null;
  createdAt: Date;
  expensesThisMonth: number;
  properties: TreeProperty[];
};

export type PortfolioTree = TreePortfolio[];

// One server fetch: all of an owner's portfolios with nested properties and
// their units (incl. status + current tenant) in a single nested-include query.
export async function getPortfolioTree(
  ownerId: string,
): Promise<PortfolioTree> {
  const [portfolios, monthlyExpenses] = await Promise.all([
    prisma.portfolio.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: {
      properties: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { utilityAccounts: true } },
          subProperties: {
            orderBy: { createdAt: 'desc' },
            include: {
              tenancies: {
                where: { status: 'ACTIVE' },
                orderBy: { startDate: 'desc' },
                take: 1,
                include: {
                  tenant: { select: { name: true } },
                  rentLedger: {
                    select: { amountDue: true, amountPaid: true, paidDate: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    }),
    getMonthlyExpenseByPortfolio(ownerId),
  ]);

  return portfolios.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    createdAt: p.createdAt,
    expensesThisMonth: monthlyExpenses.get(p.id) ?? 0,
    properties: p.properties.map((pr) => ({
      id: pr.id,
      name: pr.name,
      address: pr.address,
      city: pr.city,
      country: pr.country,
      type: pr.type,
      status: pr.status,
      notes: pr.notes,
      createdAt: pr.createdAt,
      utilityAccountCount: pr._count.utilityAccounts,
      units: pr.subProperties.map((u) => {
        const ledger = u.tenancies[0]?.rentLedger ?? [];
        const outstanding = ledger.reduce(
          (sum, l) => sum + Math.max(0, l.amountDue - l.amountPaid),
          0,
        );
        const paidDates = ledger
          .map((l) => l.paidDate)
          .filter((d): d is Date => d != null);
        const lastPaymentDate = paidDates.length
          ? paidDates.reduce((a, b) => (a > b ? a : b))
          : null;
        return {
          id: u.id,
          name: u.name,
          unitNumber: u.unitNumber,
          floor: u.floor,
          areaSqft: u.areaSqft,
          rentAmount: u.rentAmount,
          status: u.status,
          notes: u.notes,
          currentTenantName: u.tenancies[0]?.tenant.name ?? null,
          outstanding,
          lastPaymentDate,
        };
      }),
    })),
  }));
}
