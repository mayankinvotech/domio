import type {
  SubPropertyStatus,
  PropertyType,
  TenancyStatus,
  RentStatus,
  UtilityType,
  BillStatus,
  ExpenseCategory,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { markOverdueBills } from '@/lib/utilities';

export type UnitDetail = {
  unit: {
    id: string;
    displayId: string | null;
    name: string;
    unitNumber: string;
    floor: string | null;
    areaSqft: number | null;
    rentAmount: number;
    status: SubPropertyStatus;
    notes: string | null;
    propertyId: string;
    propertyName: string;
    propertyType: PropertyType;
    portfolioId: string;
    portfolioName: string;
  };
  tenancy: {
    id: string;
    displayId: string | null;
    status: TenancyStatus;
    startDate: Date;
    endDate: Date;
    monthlyRent: number;
    securityDeposit: number;
    paymentDayOfMonth: number;
    tenant: {
      id: string;
      displayId: string | null;
      name: string;
      email: string | null;
      phone: string;
      bankName: string | null;
      bankAccountNumber: string | null;
      emergencyContactName: string | null;
      emergencyContactPhone: string | null;
    };
  } | null;
  rentLedger: {
    id: string;
    dueDate: Date;
    amountDue: number;
    amountPaid: number;
    paidDate: Date | null;
    reference: string | null;
    status: RentStatus;
  }[];
  utilityAccounts: {
    id: string;
    type: UtilityType;
    provider: string;
    accountNumber: string;
    latestBill: { amount: number; dueDate: Date; status: BillStatus } | null;
  }[];
  expenses: {
    id: string;
    date: Date;
    category: ExpenseCategory;
    amount: number;
    description: string | null;
  }[];
  utilityPending: number;
  subunitCollection: number;
};

// Single server load for the unit detail page. Returns null if the unit
// doesn't exist or doesn't belong to the owner.
export async function getUnitDetail(
  unitId: string,
  ownerId: string,
): Promise<UnitDetail | null> {
  // Keep utility bill statuses fresh before we read them.
  await markOverdueBills(ownerId);

  const [unit, billAgg] = await Promise.all([
    prisma.subProperty.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        displayId: true,
        name: true,
        unitNumber: true,
        floor: true,
        areaSqft: true,
        rentAmount: true,
        status: true,
        notes: true,
        ownerId: true,
        propertyId: true,
        property: {
          select: {
            name: true,
            type: true,
            portfolioId: true,
            portfolio: { select: { name: true } },
          },
        },
        tenancies: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
          select: {
            id: true,
            displayId: true,
            status: true,
            startDate: true,
            endDate: true,
            monthlyRent: true,
            securityDeposit: true,
            paymentDayOfMonth: true,
            tenant: {
              select: {
                id: true,
                displayId: true,
                name: true,
                email: true,
                phone: true,
                bankName: true,
                bankAccountNumber: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
              },
            },
            rentLedger: {
              orderBy: { dueDate: 'asc' },
              select: {
                id: true,
                dueDate: true,
                amountDue: true,
                amountPaid: true,
                paidDate: true,
                reference: true,
                status: true,
              },
            },
          },
        },
        utilityAccounts: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            provider: true,
            accountNumber: true,
            bills: {
              orderBy: { billDate: 'desc' },
              take: 1,
              select: { amount: true, dueDate: true, status: true },
            },
          },
        },
        expenses: {
          orderBy: { date: 'desc' },
          take: 10,
          select: {
            id: true,
            date: true,
            category: true,
            amount: true,
            description: true,
          },
        },
      },
    }),
    prisma.utilityBill.aggregate({
      _sum: { amount: true, amountPaid: true },
      where: {
        ownerId,
        status: { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] },
        utilityAccount: { subPropertyId: unitId },
      },
    }),
  ]);

  if (!unit || unit.ownerId !== ownerId) return null;

  // Query sum of payments collected for child subunits (if any exist)
  const subunitCollectionAgg = await prisma.rentLedger.aggregate({
    _sum: { amountPaid: true },
    where: {
      ownerId,
      tenancy: {
        rentableEntity: {
          parentId: unitId,
        },
      },
    },
  });

  const tenancy = unit.tenancies[0] ?? null;

  return {
    unit: {
      id: unit.id,
      displayId: unit.displayId,
      name: unit.name,
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      areaSqft: unit.areaSqft,
      rentAmount: unit.rentAmount,
      status: unit.status,
      notes: unit.notes,
      propertyId: unit.propertyId,
      propertyName: unit.property.name,
      propertyType: unit.property.type,
      portfolioId: unit.property.portfolioId,
      portfolioName: unit.property.portfolio.name,
    },
    tenancy: tenancy
      ? {
          id: tenancy.id,
          displayId: tenancy.displayId,
          status: tenancy.status,
          startDate: tenancy.startDate,
          endDate: tenancy.endDate,
          monthlyRent: tenancy.monthlyRent,
          securityDeposit: tenancy.securityDeposit,
          paymentDayOfMonth: tenancy.paymentDayOfMonth,
          tenant: tenancy.tenant,
        }
      : null,
    rentLedger: tenancy ? tenancy.rentLedger : [],
    utilityAccounts: unit.utilityAccounts.map((a) => ({
      id: a.id,
      type: a.type,
      provider: a.provider,
      accountNumber: a.accountNumber,
      latestBill: a.bills[0] ?? null,
    })),
    expenses: unit.expenses,
    utilityPending:
      (billAgg._sum.amount ?? 0) - (billAgg._sum.amountPaid ?? 0),
    subunitCollection: subunitCollectionAgg._sum.amountPaid ?? 0,
  };
}
