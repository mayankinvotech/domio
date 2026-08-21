import { redirect } from 'next/navigation';
import { auth } from '@/auth';

// Documents are owner data — only OWNER and MANAGER may enter.
export default async function DocumentsLayout({
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
