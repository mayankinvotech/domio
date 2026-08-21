import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';

const TABS = [
  { href: '/dashboard/settings/appearance', label: 'Appearance' },
  { href: '/dashboard/settings/security', label: 'Security' },
  { href: '/dashboard/settings/notifications', label: 'Notifications' },
  { href: '/dashboard/settings/email-history', label: 'Email History' },
];

// Settings are owner-only.
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== 'OWNER') {
    redirect('/dashboard');
  }
  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.04)] px-4 py-1.5 text-sm font-medium text-[#B0B0C8] transition-colors hover:border-[#71717a] hover:text-white"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
