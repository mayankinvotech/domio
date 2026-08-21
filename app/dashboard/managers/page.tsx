import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listManagersForOwner } from '@/lib/managers';
import ManagersGrid from './managers-grid';

export default async function ManagersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const managers = await listManagersForOwner(session.user.id);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ManagersGrid managers={managers} />
    </div>
  );
}
