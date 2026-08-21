import { prisma } from '@/lib/prisma';

export type NotificationConfigData = {
  emailEnabled: boolean;
  rentReminderEnabled: boolean;
  rentReminderIntervalDays: number;
  leaseExpiryEnabled: boolean;
  leaseExpiryDays: number[];
  paymentConfirmEnabled: boolean;
  utilityReminderEnabled: boolean;
  welcomeEmailEnabled: boolean;
};

// Fetch the owner's config, creating defaults on first access.
export async function getOrCreateNotificationConfig(ownerId: string) {
  const existing = await prisma.notificationConfig.findUnique({
    where: { ownerId },
  });
  if (existing) return existing;
  return prisma.notificationConfig.create({ data: { ownerId } });
}

// Validate + coerce a partial config update body.
export function parseConfigInput(
  body: unknown,
): Partial<NotificationConfigData> {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: Partial<NotificationConfigData> = {};

  const bools = [
    'emailEnabled',
    'rentReminderEnabled',
    'leaseExpiryEnabled',
    'paymentConfirmEnabled',
    'utilityReminderEnabled',
    'welcomeEmailEnabled',
  ] as const;
  const boolTarget = out as Record<string, boolean>;
  for (const k of bools) {
    if (typeof b[k] === 'boolean') boolTarget[k] = b[k] as boolean;
  }

  if (b.rentReminderIntervalDays !== undefined) {
    const n = Number(b.rentReminderIntervalDays);
    if (Number.isFinite(n) && n >= 1 && n <= 365) {
      out.rentReminderIntervalDays = Math.round(n);
    }
  }

  if (Array.isArray(b.leaseExpiryDays)) {
    const days = b.leaseExpiryDays
      .map((d) => Math.round(Number(d)))
      .filter((d) => Number.isFinite(d) && d >= 1 && d <= 365)
      .sort((a, c) => c - a);
    out.leaseExpiryDays = days;
  }

  return out;
}
