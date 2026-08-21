import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Access control for the whole admin section (/dashboard/admin/*).
// Non-super-admins are redirected to /dashboard.
export default async function AdminLayout({
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
