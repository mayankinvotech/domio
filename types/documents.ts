import type { DocumentType, EntityType } from '@prisma/client';

export type DocumentWithUrl = {
  id: string;
  displayId: string | null;
  name: string;
  documentType: DocumentType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  expiryDate: Date | null;
  entityType: EntityType;
  entityId: string;
  createdAt: Date;
  signedUrl: string;
  description: string | null;
  // Resolved human label for the linked entity (e.g. "Unit 1 · UN-0001").
  entityLabel: string | null;
};
