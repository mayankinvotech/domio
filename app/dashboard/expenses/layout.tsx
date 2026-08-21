import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Access control for /dashboard/expenses*. OWNER and MANAGER only.
export default async function ExpensesLayout({
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
