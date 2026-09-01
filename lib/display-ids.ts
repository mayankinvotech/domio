import { prisma } from '@/lib/prisma';

// Human-readable IDs backed by Postgres sequences (atomic, gap-tolerant).
// Sequences are created by scripts/create-sequences.ts.

export async function generateAccountId(): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('account_seq')`;
    const seq = Number(result[0].nextval);
    return `DMO-${year}-${String(seq).padStart(5, '0')}`;
  } catch {
    return `DMO-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
  }
}

export async function generatePortfolioId(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('portfolio_seq')`;
    return `PF-${String(Number(result[0].nextval)).padStart(4, '0')}`;
  } catch {
    return `PF-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export async function generatePropertyId(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('property_seq')`;
    return `PR-${String(Number(result[0].nextval)).padStart(4, '0')}`;
  } catch {
    return `PR-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export async function generateUnitId(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('unit_seq')`;
    return `UN-${String(Number(result[0].nextval)).padStart(4, '0')}`;
  } catch {
    return `UN-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export async function generateRentableEntityId(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('rentable_entity_seq')`;
    return `RE-${String(Number(result[0].nextval)).padStart(4, '0')}`;
  } catch {
    return `RE-${Math.floor(1000 + Math.random() * 9000)}`;
  }
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
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('tenancy_seq')`;
    return `TC-${String(Number(result[0].nextval)).padStart(4, '0')}`;
  } catch {
    return `TC-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export async function generateDocumentId(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('document_seq')`;
    return `DOC-${String(Number(result[0].nextval)).padStart(4, '0')}`;
  } catch {
    return `DOC-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export async function generateImportId(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('import_seq')`;
    return `IMP-${String(Number(result[0].nextval)).padStart(4, '0')}`;
  } catch {
    return `IMP-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export async function generateManagerDisplayId(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<
      [{ nextval: bigint }]
    >`SELECT nextval('manager_seq')`;
    return `MGR-${String(Number(result[0].nextval)).padStart(4, '0')}`;
  } catch {
    return `MGR-${Math.floor(1000 + Math.random() * 9000)}`;
  }
}
