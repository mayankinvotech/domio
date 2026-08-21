import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Only OWNERs manage managers.
export default async function ManagersLayout({
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
