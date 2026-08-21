import type { PortfolioType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getMonthlyExpenseByPortfolio } from '@/lib/expenses';

export type PortfolioListItem = {
  id: string;
  name: string;
  type: PortfolioType;
  description: string | null;
  createdAt: Date;
  propertyCount: number;
  expensesThisMonth: number;
  properties: { id: string; name: string }[];
};

// A single portfolio, but only if it belongs to the given owner (else null).
export async function getOwnedPortfolio(id: string, ownerId: string) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    select: { id: true, name: true, type: true, description: true, ownerId: true },
  });
  if (!portfolio || portfolio.ownerId !== ownerId) return null;
  return portfolio;
}

// Portfolios owned by a single user, newest first, with property count + names.
export async function listPortfoliosForOwner(
  ownerId: string,
): Promise<PortfolioListItem[]> {
  const [rows, monthly] = await Promise.all([
    prisma.portfolio.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        createdAt: true,
        _count: { select: { properties: true } },
        properties: {
          select: { id: true, name: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    getMonthlyExpenseByPortfolio(ownerId),
  ]);

  return rows.map(({ _count, ...rest }) => ({
    ...rest,
    propertyCount: _count.properties,
    expensesThisMonth: monthly.get(rest.id) ?? 0,
  }));
}
