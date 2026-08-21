import type { ImportType, ImportStatus } from '@prisma/client';

export const IMPORT_TYPES: {
  value: ImportType;
  label: string;
  icon: string;
  description: string;
  enabled: boolean;
}[] = [
  {
    value: 'FIRST_TIME_PROPERTY_LOAD',
    label: 'First Time Property Load',
    icon: '🏢',
    description:
      'Import a property, its units, tenants and full rent payment history from one spreadsheet.',
    enabled: true,
  },
  {
    value: 'BANK_STATEMENT',
    label: 'Bank Statement',
    icon: '🏦',
    description: 'Reconcile rent payments from a bank statement export.',
    enabled: false,
  },
  {
    value: 'EXPENSE_IMPORT',
    label: 'Expense Import',
    icon: '📊',
    description: 'Bulk import historical expenses against your properties.',
    enabled: false,
  },
];

export function importTypeLabel(value: ImportType): string {
  return IMPORT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function isImportType(v: unknown): v is ImportType {
  return typeof v === 'string' && IMPORT_TYPES.some((t) => t.value === v);
}

export const IMPORT_STATUS_META: Record<
  ImportStatus,
  { label: string; tone: 'violet' | 'gold' | 'green' | 'red' | 'muted' }
> = {
  UPLOADING: { label: 'Uploading', tone: 'muted' },
  ANALYSING: { label: 'Analysing', tone: 'violet' },
  AWAITING_INPUT: { label: 'Awaiting Input', tone: 'gold' },
  READY_TO_IMPORT: { label: 'Ready', tone: 'violet' },
  IMPORTING: { label: 'Importing', tone: 'violet' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  ROLLED_BACK: { label: 'Rolled Back', tone: 'muted' },
  FAILED: { label: 'Failed', tone: 'red' },
};

// Rollback is allowed on completed imports within this many days.
export const ROLLBACK_WINDOW_DAYS = 30;

export function canRollback(job: {
  status: ImportStatus;
  confirmedAt: Date | string | null;
}): boolean {
  if (job.status !== 'COMPLETED' || !job.confirmedAt) return false;
  const confirmed = new Date(job.confirmedAt).getTime();
  const ageDays = (Date.now() - confirmed) / 86_400_000;
  return ageDays <= ROLLBACK_WINDOW_DAYS;
}
