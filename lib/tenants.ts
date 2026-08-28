import type { TenancyStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type TenantPaymentStatus =
  | 'PAID'
  | 'PARTIAL'
  | 'UNPAID'
  | 'OVERDUE'
  | 'NO_LEASE';

export type TenantListItem = {
  id: string;
  displayId: string | null;
  name: string;
  email: string | null;
  phone: string;
  location: string | null;
  nationalId: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  rentReminderEnabled: boolean;
  documentCount: number;
  totalPaid: number;
  remainingRent: number;
  paidStatus: TenantPaymentStatus;
  overdueAmount: number;
  currentTenancy: {
    id: string;
    status: TenancyStatus;
    unitName: string;
    unitNumber: string;
    monthlyRent: number;
    currentBalance: number; // negative = owed
    startDate: Date;
    endDate: Date;
  } | null;
};

// Tenants owned by a user, newest first, each with their current (ACTIVE) unit.
// `subPropertyIds` (managers) restricts to tenants with a tenancy in those units.
export async function listTenantsForOwner(
  ownerId: string,
  subPropertyIds?: string[],
  role?: string,
): Promise<TenantListItem[]> {
  const whereClause =
    role === 'SUPER_ADMIN'
      ? {}
      : {
          ownerId,
          ...(subPropertyIds
            ? {
                tenancies: {
                  some: { subPropertyId: { in: subPropertyIds }, status: 'ACTIVE' },
                },
              }
            : {}),
        };

  const [rows, docCountRows, balanceRows, rentLedgerPaidRows, rentLedgerDueRows] = await Promise.all([
    prisma.tenant.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayId: true,
        name: true,
        email: true,
        phone: true,
        location: true,
        nationalId: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        bankAccountNumber: true,
        bankName: true,
        rentReminderEnabled: true,
        tenancies: {
          orderBy: { startDate: 'desc' },
          select: {
            id: true,
            status: true,
            monthlyRent: true,
            startDate: true,
            endDate: true,
            subProperty: { select: { name: true, unitNumber: true } },
            rentableEntity: { select: { name: true, code: true } },
          },
        },
      },
    }),
    prisma.document.groupBy({
      by: ['entityId'],
      where: { ownerId, entityType: 'TENANT' },
      _count: true,
    }),
    // Running balance per tenancy (LedgerEntry sum; negative = owed).
    prisma.ledgerEntry.groupBy({
      by: ['tenancyId'],
      where: { tenancy: { ownerId } },
      _sum: { amount: true },
    }),
    // Total rent paid per tenancy
    prisma.rentLedger.groupBy({
      by: ['tenancyId'],
      where: { ownerId },
      _sum: { amountPaid: true },
    }),
    // Total rent due per tenancy
    prisma.rentLedger.groupBy({
      by: ['tenancyId'],
      where: { ownerId },
      _sum: { amountDue: true },
    }),
  ]);

  const docCounts = new Map<string, number>(
    docCountRows.map((r) => [r.entityId, r._count]),
  );
  const balanceByTenancy = new Map<string, number>(
    balanceRows.map((r) => [r.tenancyId, r._sum.amount ?? 0]),
  );
  const paidByTenancy = new Map<string, number>(
    rentLedgerPaidRows.map((r) => [r.tenancyId, r._sum.amountPaid ?? 0]),
  );
  const dueByTenancy = new Map<string, number>(
    rentLedgerDueRows.map((r) => [r.tenancyId, r._sum.amountDue ?? 0]),
  );

  return rows.map((t) => {
    const activeTenancies = t.tenancies.filter((x) => x.status === 'ACTIVE');
    const current = activeTenancies[0] ?? t.tenancies[0] ?? null;

    let tenantTotalPaid = 0;
    let tenantTotalDue = 0;
    for (const tenancy of t.tenancies) {
      tenantTotalPaid += paidByTenancy.get(tenancy.id) ?? 0;
      tenantTotalDue += dueByTenancy.get(tenancy.id) ?? 0;
    }

    const currentBalance = current ? (balanceByTenancy.get(current.id) ?? 0) : 0;
    const overdueAmount = Math.max(0, -currentBalance);

    // Calculate remaining rent and status
    let remainingRent = 0;
    let paidStatus: TenantPaymentStatus = 'NO_LEASE';

    if (current) {
      if (currentBalance < 0) {
        remainingRent = Math.abs(currentBalance);
        paidStatus = tenantTotalPaid > 0 ? 'PARTIAL' : 'OVERDUE';
      } else if (currentBalance > 0) {
        remainingRent = 0;
        paidStatus = 'PAID';
      } else {
        // Balance is 0
        if (tenantTotalPaid > 0 || (tenantTotalDue > 0 && tenantTotalPaid >= tenantTotalDue)) {
          remainingRent = 0;
          paidStatus = 'PAID';
        } else {
          remainingRent = current.monthlyRent;
          paidStatus = 'UNPAID';
        }
      }
    }

    return {
      id: t.id,
      displayId: t.displayId,
      name: t.name,
      email: t.email,
      phone: t.phone,
      location: t.location,
      nationalId: t.nationalId,
      emergencyContactName: t.emergencyContactName,
      emergencyContactPhone: t.emergencyContactPhone,
      bankAccountNumber: t.bankAccountNumber,
      bankName: t.bankName,
      rentReminderEnabled: t.rentReminderEnabled,
      documentCount: docCounts.get(t.id) ?? 0,
      totalPaid: tenantTotalPaid,
      remainingRent,
      paidStatus,
      overdueAmount,
      currentTenancy: current
        ? {
            id: current.id,
            status: current.status,
            unitName: current.subProperty?.name ?? current.rentableEntity?.name ?? 'Unit',
            unitNumber: current.subProperty?.unitNumber ?? current.rentableEntity?.code ?? '—',
            monthlyRent: current.monthlyRent,
            currentBalance,
            startDate: current.startDate,
            endDate: current.endDate,
          }
        : null,
    };
  });
}

// A single tenant (scalar fields) if owned, for the edit form.
export async function getOwnedTenant(id: string, ownerId: string, role?: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      location: true,
      nationalId: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      bankAccountNumber: true,
      bankName: true,
      ownerId: true,
      // Active tenancy (for editing rent + lease details on the edit form).
      tenancies: {
        where: { status: 'ACTIVE' },
        orderBy: { startDate: 'desc' },
        take: 1,
        select: {
          id: true,
          monthlyRent: true,
          startDate: true,
          endDate: true,
          paymentDayOfMonth: true,
        },
      },
    },
  });
  if (!tenant) return null;
  if (role !== 'SUPER_ADMIN' && tenant.ownerId && tenant.ownerId !== ownerId) return null;
  return tenant;
}

// Tenant + full tenancy history (newest first) for the detail page.
export async function getOwnedTenantDetail(id: string, ownerId: string, role?: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      location: true,
      nationalId: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      bankAccountNumber: true,
      bankName: true,
      portalEnabled: true,
      ownerId: true,
      tenancies: {
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          monthlyRent: true,
          securityDeposit: true,
          paymentDayOfMonth: true,
          subProperty: {
            select: {
              id: true,
              name: true,
              unitNumber: true,
              propertyId: true,
              property: { select: { name: true, portfolioId: true } },
            },
          },
          rentableEntity: {
            select: {
              id: true,
              name: true,
              code: true,
              propertyId: true,
              property: { select: { name: true, portfolioId: true } },
            },
          },
        },
      },
    },
  });
  if (!tenant) return null;
  if (role !== 'SUPER_ADMIN' && tenant.ownerId && tenant.ownerId !== ownerId) return null;
  return tenant;
}

export type ParsedTenant = {
  name: string;
  email: string | null;
  phone: string;
  location: string | null;
  nationalId: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
};

function optString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Validate + coerce a tenant request body (shared by POST and PATCH).
export function parseTenantInput(
  body: unknown,
): { data: ParsedTenant } | { error: string } {
  const {
    name,
    email,
    phone,
    location,
    nationalId,
    emergencyContactName,
    emergencyContactPhone,
    bankAccountNumber,
    bankName,
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Name is required.' };
  }
  // Phone is required (it is the portal login credential)
  if (typeof phone !== 'string' || !phone.trim()) {
    return { error: 'Phone number is required.' };
  }
  // Email is optional
  const resolvedEmail =
    typeof email === 'string' && email.trim().includes('@')
      ? email.trim().toLowerCase()
      : null;

  return {
    data: {
      name: name.trim(),
      email: resolvedEmail,
      phone: phone.trim(),
      location: optString(location),
      nationalId: optString(nationalId),
      emergencyContactName: optString(emergencyContactName),
      emergencyContactPhone: optString(emergencyContactPhone),
      bankAccountNumber: optString(bankAccountNumber),
      bankName: optString(bankName),
    },
  };
}
