import type { DocumentType, EntityType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/r2';
import type { DocumentWithUrl } from '@/types/documents';

const docSelect = {
  id: true,
  displayId: true,
  name: true,
  documentType: true,
  fileKey: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  expiryDate: true,
  entityType: true,
  entityId: true,
  createdAt: true,
  description: true,
} as const;

type DocRow = {
  id: string;
  displayId: string | null;
  name: string;
  documentType: DocumentType;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate: Date | null;
  entityType: EntityType;
  entityId: string;
  createdAt: Date;
  description: string | null;
};

// Resolve human-readable labels for the entities documents are linked to.
async function resolveEntityLabels(
  ownerId: string,
  rows: DocRow[],
): Promise<Map<string, string>> {
  const byType: Record<EntityType, Set<string>> = {
    PORTFOLIO: new Set(),
    PROPERTY: new Set(),
    SUB_PROPERTY: new Set(),
    TENANT: new Set(),
  };
  for (const r of rows) byType[r.entityType].add(r.entityId);

  const labels = new Map<string, string>();
  const key = (t: EntityType, id: string) => `${t}:${id}`;

  const [portfolios, properties, units, tenants] = await Promise.all([
    byType.PORTFOLIO.size
      ? prisma.portfolio.findMany({
          where: { ownerId, id: { in: [...byType.PORTFOLIO] } },
          select: { id: true, name: true, displayId: true },
        })
      : [],
    byType.PROPERTY.size
      ? prisma.property.findMany({
          where: { ownerId, id: { in: [...byType.PROPERTY] } },
          select: { id: true, name: true, displayId: true },
        })
      : [],
    byType.SUB_PROPERTY.size
      ? prisma.subProperty.findMany({
          where: { ownerId, id: { in: [...byType.SUB_PROPERTY] } },
          select: { id: true, name: true, unitNumber: true, displayId: true },
        })
      : [],
    byType.TENANT.size
      ? prisma.tenant.findMany({
          where: { ownerId, id: { in: [...byType.TENANT] } },
          select: { id: true, name: true, displayId: true },
        })
      : [],
  ]);

  const tag = (name: string, displayId: string | null) =>
    displayId ? `${name} · ${displayId}` : name;

  for (const p of portfolios) labels.set(key('PORTFOLIO', p.id), tag(p.name, p.displayId));
  for (const p of properties) labels.set(key('PROPERTY', p.id), tag(p.name, p.displayId));
  for (const u of units)
    labels.set(key('SUB_PROPERTY', u.id), tag(`Unit ${u.unitNumber}`, u.displayId));
  for (const t of tenants) labels.set(key('TENANT', t.id), tag(t.name, t.displayId));

  return labels;
}

async function toDocumentsWithUrls(
  ownerId: string,
  rows: DocRow[],
): Promise<DocumentWithUrl[]> {
  const [labels, signed] = await Promise.all([
    resolveEntityLabels(ownerId, rows),
    Promise.all(rows.map((r) => getSignedDownloadUrl(r.fileKey))),
  ]);
  return rows.map((r, i) => ({
    id: r.id,
    displayId: r.displayId,
    name: r.name,
    documentType: r.documentType,
    fileName: r.fileName,
    fileSize: r.fileSize,
    mimeType: r.mimeType,
    expiryDate: r.expiryDate,
    entityType: r.entityType,
    entityId: r.entityId,
    createdAt: r.createdAt,
    description: r.description,
    signedUrl: signed[i],
    entityLabel: labels.get(`${r.entityType}:${r.entityId}`) ?? null,
  }));
}

export type DocumentFilters = {
  entityType?: EntityType;
  entityId?: string;
  documentType?: DocumentType;
  // Manager scope: restrict to docs on accessible properties/units (and the
  // tenants of accessible units) only.
  scope?: { propertyIds: string[]; subPropertyIds: string[]; tenantIds?: string[] };
};

export async function listDocumentsForOwner(
  ownerId: string,
  filters: DocumentFilters = {},
): Promise<DocumentWithUrl[]> {
  const rows = await prisma.document.findMany({
    where: {
      ownerId,
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.documentType ? { documentType: filters.documentType } : {}),
      ...(filters.scope
        ? {
            OR: [
              {
                entityType: 'PROPERTY' as const,
                entityId: { in: filters.scope.propertyIds },
              },
              {
                entityType: 'SUB_PROPERTY' as const,
                entityId: { in: filters.scope.subPropertyIds },
              },
              {
                entityType: 'TENANT' as const,
                entityId: { in: filters.scope.tenantIds ?? [] },
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: docSelect,
  });
  return toDocumentsWithUrls(ownerId, rows);
}

export async function getOwnedDocumentWithUrl(
  id: string,
  ownerId: string,
): Promise<DocumentWithUrl | null> {
  const row = await prisma.document.findUnique({
    where: { id },
    select: { ...docSelect, ownerId: true },
  });
  if (!row || row.ownerId !== ownerId) return null;
  const [doc] = await toDocumentsWithUrls(ownerId, [row]);
  return doc;
}
