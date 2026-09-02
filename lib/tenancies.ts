import { prisma } from '@/lib/prisma';

export type VacantUnitOption = {
  id: string;
  unitNumber: string;
  name: string;
  rentAmount: number;
  isRentableEntity?: boolean;
  entityType?: string;
};

export type PropertyWithVacantUnits = {
  id: string;
  name: string;
  vacantUnits: VacantUnitOption[];
};

// Owner's properties each with their currently-VACANT units (for the assign form).
// IMPORTANT: Only LEAF entities (entities with NO child sub-units) can be assigned a tenant.
export async function listVacantUnitsByProperty(
  ownerId: string,
  role?: string,
): Promise<PropertyWithVacantUnits[]> {
  const whereClause = role === 'SUPER_ADMIN' ? {} : { ownerId };
  const rows = await prisma.property.findMany({
    where: whereClause,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      subProperties: {
        where: { status: 'VACANT' },
        orderBy: { unitNumber: 'asc' },
        select: { id: true, unitNumber: true, name: true, rentAmount: true },
      },
      rentableEntities: {
        // STRICT RULE: Only leaf units (nodes with NO children) can be assigned a tenant
        where: {
          status: 'VACANT',
          children: { none: {} },
        },
        orderBy: [{ type: 'asc' }, { code: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          rentAmount: true,
          parent: { select: { name: true, type: true } },
        },
      },
    },
  });

  return rows.map((p) => {
    // If the property uses RentableEntity hierarchy, use leaf rentable entities.
    // If no rentable entities exist, fall back to subProperties.
    const entityUnits: VacantUnitOption[] = p.rentableEntities.map((re) => {
      const parentLabel = re.parent ? `${re.parent.name} → ` : '';
      return {
        id: re.id,
        unitNumber: re.code,
        name: `${parentLabel}${re.name} (${re.type})`,
        rentAmount: re.rentAmount,
        isRentableEntity: true,
        entityType: re.type,
      };
    });

    const subUnits: VacantUnitOption[] = p.subProperties.map((sp) => ({
      id: sp.id,
      unitNumber: sp.unitNumber,
      name: sp.name,
      rentAmount: sp.rentAmount,
      isRentableEntity: false,
    }));

    return {
      id: p.id,
      name: p.name,
      vacantUnits: entityUnits.length > 0 ? entityUnits : subUnits,
    };
  });
}

export type ParsedTenancy = {
  subPropertyId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  paymentDayOfMonth: number;
};

function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Validate + coerce a tenancy creation body.
export function parseTenancyInput(
  body: unknown,
): { data: ParsedTenancy } | { error: string } {
  const {
    subPropertyId,
    startDate,
    endDate,
    monthlyRent,
    securityDeposit,
    paymentDayOfMonth,
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof subPropertyId !== 'string' || !subPropertyId) {
    return { error: 'A unit is required.' };
  }

  const start = toDate(startDate);
  const end = toDate(endDate);
  if (!start) return { error: 'A valid start date is required.' };
  if (!end) return { error: 'A valid end date is required.' };
  if (end <= start) return { error: 'End date must be after the start date.' };

  const rent =
    typeof monthlyRent === 'number' ? monthlyRent : Number(monthlyRent);
  if (!Number.isFinite(rent) || rent < 0) {
    return { error: 'A valid monthly rent is required.' };
  }

  let deposit = 0;
  if (
    securityDeposit !== undefined &&
    securityDeposit !== null &&
    securityDeposit !== ''
  ) {
    deposit =
      typeof securityDeposit === 'number'
        ? securityDeposit
        : Number(securityDeposit);
    if (!Number.isFinite(deposit) || deposit < 0) {
      return { error: 'Security deposit must be a valid number.' };
    }
  }

  const day =
    typeof paymentDayOfMonth === 'number'
      ? paymentDayOfMonth
      : Number(paymentDayOfMonth);
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    return { error: 'Payment day must be a whole number between 1 and 28.' };
  }

  return {
    data: {
      subPropertyId,
      startDate: start,
      endDate: end,
      monthlyRent: rent,
      securityDeposit: deposit,
      paymentDayOfMonth: day,
    },
  };
}
