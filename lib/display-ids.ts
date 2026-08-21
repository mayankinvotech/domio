import { prisma } from '@/lib/prisma';

// Human-readable IDs backed by Postgres sequences (atomic, gap-tolerant).
// Sequences are created by scripts/create-sequences.ts.

export async function generateAccountId(): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint }]
  >`SELECT nextval('account_seq')`;
  const seq = Number(result[0].nextval);
  const year = new Date().getFullYear();
  return `DMO-${year}-${String(seq).padStart(5, '0')}`;
}

export async function generatePortfolioId(): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint }]
  >`SELECT nextval('portfolio_seq')`;
  return `PF-${String(Number(result[0].nextval)).padStart(4, '0')}`;
}

export async function generatePropertyId(): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint }]
  >`SELECT nextval('property_seq')`;
  return `PR-${String(Number(result[0].nextval)).padStart(4, '0')}`;
}

export async function generateUnitId(): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint }]
  >`SELECT nextval('unit_seq')`;
  return `UN-${String(Number(result[0].nextval)).padStart(4, '0')}`;
}

export async function generateRentableEntityId(): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint }]
  >`SELECT nextval('rentable_entity_seq')`;
  return `RE-${String(Number(result[0].nextval)).padStart(4, '0')}`;
}

export async function generateTenantId(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('tenant_seq')`;
    return `TN-${String(Number(result[0].nextval)).padStart(4, '0')}`;
  } catch {
    return `TN-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export async function generateTenancyId(): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint }]
  >`SELECT nextval('tenancy_seq')`;
  return `TC-${String(Number(result[0].nextval)).padStart(4, '0')}`;
}

export async function generateDocumentId(): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint }]
  >`SELECT nextval('document_seq')`;
  return `DOC-${String(Number(result[0].nextval)).padStart(4, '0')}`;
}

export async function generateImportId(): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint }]
  >`SELECT nextval('import_seq')`;
  return `IMP-${String(Number(result[0].nextval)).padStart(4, '0')}`;
}

export async function generateManagerDisplayId(): Promise<string> {
  const result = await prisma.$queryRaw<
    [{ nextval: bigint }]
  >`SELECT nextval('manager_seq')`;
  return `MGR-${String(Number(result[0].nextval)).padStart(4, '0')}`;
}
