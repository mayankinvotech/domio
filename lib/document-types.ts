import type { DocumentType, EntityType } from '@prisma/client';

export const DOCUMENT_TYPES = [
  { value: 'LEASE_AGREEMENT', label: 'Lease Agreement', icon: '📄' },
  { value: 'PROPERTY_DEED', label: 'Property Deed', icon: '🏠' },
  { value: 'INSURANCE', label: 'Insurance Certificate', icon: '🛡️' },
  { value: 'INSPECTION_REPORT', label: 'Inspection Report', icon: '🔍' },
  { value: 'UTILITY_AGREEMENT', label: 'Utility Agreement', icon: '⚡' },
  { value: 'TENANT_ID', label: 'Tenant ID / Passport', icon: '🪪' },
  { value: 'BANK_STATEMENT', label: 'Bank Statement', icon: '🏦' },
  { value: 'LEGAL', label: 'Legal Document', icon: '⚖️' },
  { value: 'OTHER', label: 'Other', icon: '📎' },
] as const;

export const ENTITY_TYPES = [
  { value: 'PORTFOLIO', label: 'Portfolio' },
  { value: 'PROPERTY', label: 'Property' },
  { value: 'SUB_PROPERTY', label: 'Unit' },
  { value: 'TENANT', label: 'Tenant' },
] as const;

const ENTITY_ICONS: Record<EntityType, string> = {
  PORTFOLIO: '🗂️',
  PROPERTY: '🏢',
  SUB_PROPERTY: '🚪',
  TENANT: '👤',
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDocumentTypeLabel(type: DocumentType): string {
  return DOCUMENT_TYPES.find((d) => d.value === type)?.label ?? type;
}

export function getDocumentTypeIcon(type: DocumentType): string {
  return DOCUMENT_TYPES.find((d) => d.value === type)?.icon ?? '📄';
}

export function getEntityTypeLabel(type: EntityType): string {
  return ENTITY_TYPES.find((e) => e.value === type)?.label ?? type;
}

export function getEntityTypeIcon(type: EntityType): string {
  return ENTITY_ICONS[type] ?? '🔗';
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function isValidMimeType(mime: string): boolean {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];
  return allowed.includes(mime);
}

// Accept attribute for the file <input>.
export const ACCEPTED_FILE_EXTENSIONS =
  '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx,.txt';
