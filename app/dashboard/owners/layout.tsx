import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Access control for the whole Property Owners section (/dashboard/owners*).
// Non-super-admins are redirected to /dashboard. This is the server-side
// source of truth; the sidebar also hides the link for them.
export default async function OwnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
