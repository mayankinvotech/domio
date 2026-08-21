import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Access control for /dashboard/portfolios*. Only OWNER and MANAGER may enter;
// SUPER_ADMIN (and anyone else) is redirected to /dashboard.
export default async function PortfoliosLayout({
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
