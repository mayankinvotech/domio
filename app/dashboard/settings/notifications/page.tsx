import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOrCreateNotificationConfig } from '@/lib/notification-config';
import NotificationSettings from './notification-settings';

export default async function NotificationSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const c = await getOrCreateNotificationConfig(session.user.id);

  return (
    <NotificationSettings
      initial={{
        emailEnabled: c.emailEnabled,
        rentReminderEnabled: c.rentReminderEnabled,
        rentReminderIntervalDays: c.rentReminderIntervalDays,
        leaseExpiryEnabled: c.leaseExpiryEnabled,
        leaseExpiryDays: c.leaseExpiryDays,
        paymentConfirmEnabled: c.paymentConfirmEnabled,
        utilityReminderEnabled: c.utilityReminderEnabled,
        welcomeEmailEnabled: c.welcomeEmailEnabled,
      }}
    />
  );
}
