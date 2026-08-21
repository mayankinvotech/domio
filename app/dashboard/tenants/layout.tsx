import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Access control for /dashboard/tenants*. Only OWNER and MANAGER may enter;
// SUPER_ADMIN (and anyone else) is redirected to /dashboard.
export default async function TenantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== 'OWNER' && role !== 'MANAGER') {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
