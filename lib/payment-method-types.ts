// Pure, client-safe payment-method helpers (no Prisma runtime import).
import type { PaymentMethod } from '@prisma/client';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'DIRECT_DEPOSIT', label: 'Direct Deposit' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'OTHER', label: 'Other' },
];

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'DIRECT_DEPOSIT';

const LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  DIRECT_DEPOSIT: 'Direct Deposit',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
};

const ICONS: Record<PaymentMethod, string> = {
  CASH: '💵',
  CHEQUE: '📝',
  DIRECT_DEPOSIT: '🏦',
  BANK_TRANSFER: '💸',
  OTHER: '❓',
};

export function paymentMethodLabel(m: PaymentMethod): string {
  return LABELS[m];
}

export function paymentMethodIcon(m: PaymentMethod): string {
  return ICONS[m];
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(LABELS, value)
  );
}
