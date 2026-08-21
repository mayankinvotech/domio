import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Data import is an owner-only tool (it creates properties, tenants & ledgers).
export default async function ImportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role !== 'OWNER') {
    redirect('/dashboard');
  }
  return <>{children}</>;
}
