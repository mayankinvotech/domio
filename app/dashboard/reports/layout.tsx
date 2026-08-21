import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Reports are owner/manager data.
export default async function ReportsLayout({
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
