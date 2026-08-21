import type {
  PaymentMethod,
  PropertyType,
  RentStatus,
} from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  generateTenantId,
  generateUnitId,
  generatePropertyId,
  generateTenancyId,
} from '@/lib/display-ids';
import type { AIAnalysisResult } from './ai-analyser';

export interface ImportUserInputs {
  portfolioId: string;
  propertyName: string;
  propertyAddress: string;
  propertyCity: string;
  propertyCountry: string;
  propertyType: string;
  units: Array<{
    tenantName: string;
    unitNumber: string;
    floor?: string;
    areaSqft?: number;
    monthlyRent: number;
    leaseStartDate: string;
    leaseEndDate?: string;
    tenantEmail?: string;
    tenantPhone?: string;
  }>;
  warningResolutions: Record<string, string>;
  gapResolutions: Record<string, string>;
}

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'CASH',
  'CHEQUE',
  'DIRECT_DEPOSIT',
  'BANK_TRANSFER',
  'OTHER',
];

function toPaymentMethod(v: string | null | undefined): PaymentMethod | null {
  return v && VALID_PAYMENT_METHODS.includes(v as PaymentMethod)
    ? (v as PaymentMethod)
    : null;
}

export async function processFirstTimeImport(
  importJobId: string,
  ownerId: string,
  analysis: AIAnalysisResult,
  userInputs: ImportUserInputs,
): Promise<{ success: boolean; summary: Record<string, number> }> {
  const summary = {
    properties: 0,
    units: 0,
    tenants: 0,
    tenancies: 0,
    ledgerEntries: 0,
  };
  const importedRecords: Array<{
    entityType: string;
    entityId: string;
    sourceData: unknown;
  }> = [];

  await prisma.$transaction(
    async (tx) => {
      // 1. Create Property
      const propertyDisplayId = await generatePropertyId();
      const property = await tx.property.create({
        data: {
          displayId: propertyDisplayId,
          name: userInputs.propertyName,
          address: userInputs.propertyAddress,
          city: userInputs.propertyCity,
          country: userInputs.propertyCountry,
          type: userInputs.propertyType as PropertyType,
          status: 'ACTIVE',
          portfolioId: userInputs.portfolioId,
          ownerId,
        },
      });
      importedRecords.push({
        entityType: 'property',
        entityId: property.id,
        sourceData: { name: property.name },
      });
      summary.properties++;

      // 2. For each tenant/unit in user inputs
      for (const unitInput of userInputs.units) {
        // Create Unit
        const unitDisplayId = await generateUnitId();
        const unit = await tx.subProperty.create({
          data: {
            displayId: unitDisplayId,
            name: unitInput.unitNumber,
            unitNumber: unitInput.unitNumber,
            floor: unitInput.floor ?? null,
            areaSqft: unitInput.areaSqft ?? null,
            rentAmount: unitInput.monthlyRent,
            status: 'OCCUPIED',
            propertyId: property.id,
            ownerId,
          },
        });
        importedRecords.push({
          entityType: 'subProperty',
          entityId: unit.id,
          sourceData: unitInput,
        });
        summary.units++;

        // Find tenant analysis data
        const tenantAnalysis = analysis.tenantsFound.find(
          (t) => t.name.toLowerCase() === unitInput.tenantName.toLowerCase(),
        );

        // Create Tenant
        const tenantDisplayId = await generateTenantId();
        const tenant = await tx.tenant.create({
          data: {
            displayId: tenantDisplayId,
            name: unitInput.tenantName,
            email:
              unitInput.tenantEmail ??
              `${unitInput.tenantName
                .toLowerCase()
                .replace(/\s+/g, '.')}@placeholder.com`,
            phone: unitInput.tenantPhone ?? '',
            ownerId,
          },
        });
        importedRecords.push({
          entityType: 'tenant',
          entityId: tenant.id,
          sourceData: { name: tenant.name },
        });
        summary.tenants++;

        // Create Tenancy
        const tenancyDisplayId = await generateTenancyId();
        const startDate = new Date(unitInput.leaseStartDate);
        const endDate = unitInput.leaseEndDate
          ? new Date(unitInput.leaseEndDate)
          : new Date('2027-12-31');

        const tenancy = await tx.tenancy.create({
          data: {
            displayId: tenancyDisplayId,
            tenantId: tenant.id,
            subPropertyId: unit.id,
            ownerId,
            startDate,
            endDate,
            monthlyRent: unitInput.monthlyRent,
            securityDeposit: 0,
            paymentDayOfMonth: 1,
            status:
              tenantAnalysis?.status === 'TERMINATED' ? 'TERMINATED' : 'ACTIVE',
          },
        });
        importedRecords.push({
          entityType: 'tenancy',
          entityId: tenancy.id,
          sourceData: { tenantName: unitInput.tenantName },
        });
        summary.tenancies++;

        // 3. Create Rent Ledger entries from payment records
        const tenantPayments = analysis.paymentRecords.filter(
          (p) =>
            p.tenantName.toLowerCase() === unitInput.tenantName.toLowerCase(),
        );

        for (const payment of tenantPayments) {
          // Handle catch-up payments
          const periods =
            payment.isCatchUp && payment.catchUpPeriods?.length
              ? payment.catchUpPeriods
              : [payment.period];

          const amountPerPeriod = payment.amount / periods.length;

          for (const period of periods) {
            const [year, month] = period.split('-').map(Number);
            const dueDate = new Date(year, month - 1, tenancy.paymentDayOfMonth);

            // Check if a ledger entry already exists for this period
            const existing = await tx.rentLedger.findFirst({
              where: { tenancyId: tenancy.id, dueDate },
            });
            if (existing) continue;

            const ledgerStatus: RentStatus =
              payment.status === 'NIL'
                ? 'OVERDUE'
                : (payment.status as RentStatus);

            const ledgerEntry = await tx.rentLedger.create({
              data: {
                tenancyId: tenancy.id,
                ownerId,
                dueDate,
                amountDue: unitInput.monthlyRent,
                amountPaid:
                  payment.status === 'PAID' || payment.status === 'PARTIAL'
                    ? amountPerPeriod
                    : 0,
                paidDate: payment.paidDate ? new Date(payment.paidDate) : null,
                paymentMethod: toPaymentMethod(payment.paymentMethod),
                status: ledgerStatus,
                notes: payment.notes ?? null,
              },
            });
            importedRecords.push({
              entityType: 'rentLedger',
              entityId: ledgerEntry.id,
              sourceData: payment,
            });
            summary.ledgerEntries++;
          }
        }
      }

      // 4. Save all imported records for rollback
      await tx.importedRecord.createMany({
        data: importedRecords.map((r) => ({
          importJobId,
          entityType: r.entityType,
          entityId: r.entityId,
          sourceData: r.sourceData as object,
        })),
      });

      // 5. Update import job status
      await tx.importJob.update({
        where: { id: importJobId },
        data: {
          status: 'COMPLETED',
          confirmedAt: new Date(),
          totalRows: analysis.paymentRecords.length,
          validRows: summary.ledgerEntries,
        },
      });
    },
    { timeout: 60000 },
  );

  return { success: true, summary };
}

// Reverse an import: delete every record it created in FK-safe order (children
// before parents). Covers both the AI flow (ledger/tenancy/tenant/unit/property)
// and the template flow (+ utility bills/accounts, expenses, portfolios).
const ROLLBACK_ORDER = [
  'utilityBill',
  'rentLedger',
  'tenancy',
  'utilityAccount',
  'expense',
  'tenant',
  'subProperty',
  'property',
  'portfolio',
] as const;

export async function rollbackImport(
  importJobId: string,
): Promise<{ deleted: number }> {
  const records = await prisma.importedRecord.findMany({
    where: { importJobId },
    select: { id: true, entityType: true, entityId: true },
  });

  let deleted = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const entityType of ROLLBACK_ORDER) {
        const ids = records
          .filter((r) => r.entityType === entityType)
          .map((r) => r.entityId);
        if (ids.length === 0) continue;

        switch (entityType) {
          case 'utilityBill':
            deleted += (
              await tx.utilityBill.deleteMany({ where: { id: { in: ids } } })
            ).count;
            break;
          case 'rentLedger':
            deleted += (
              await tx.rentLedger.deleteMany({ where: { id: { in: ids } } })
            ).count;
            break;
          case 'tenancy':
            deleted += (
              await tx.tenancy.deleteMany({ where: { id: { in: ids } } })
            ).count;
            break;
          case 'utilityAccount':
            deleted += (
              await tx.utilityAccount.deleteMany({ where: { id: { in: ids } } })
            ).count;
            break;
          case 'expense':
            deleted += (
              await tx.expense.deleteMany({ where: { id: { in: ids } } })
            ).count;
            break;
          case 'tenant':
            deleted += (
              await tx.tenant.deleteMany({ where: { id: { in: ids } } })
            ).count;
            break;
          case 'subProperty':
            deleted += (
              await tx.subProperty.deleteMany({ where: { id: { in: ids } } })
            ).count;
            break;
          case 'property':
            deleted += (
              await tx.property.deleteMany({ where: { id: { in: ids } } })
            ).count;
            break;
          case 'portfolio':
            deleted += (
              await tx.portfolio.deleteMany({ where: { id: { in: ids } } })
            ).count;
            break;
        }
      }

      // Remove the rollback ledger itself, then flag the job.
      await tx.importedRecord.deleteMany({ where: { importJobId } });
      await tx.importJob.update({
        where: { id: importJobId },
        data: { status: 'ROLLED_BACK', rolledBackAt: new Date() },
      });
    },
    { timeout: 60000 },
  );

  return { deleted };
}
