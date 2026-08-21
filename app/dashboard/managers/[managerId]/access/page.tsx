import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedManager, listManagerAccess } from '@/lib/managers';
import { getOwnerStructure } from '@/lib/expenses';
import ManageAccess from './manage-access';

export default async function ManageAccessPage({
  params,
}: {
  params: Promise<{ managerId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { managerId } = await params;
  const manager = await getOwnedManager(managerId, session.user.id);
  if (!manager) notFound();

  const [records, structure] = await Promise.all([
    listManagerAccess(managerId),
    getOwnerStructure(session.user.id),
  ]);

  return (
    <ManageAccess
      managerId={manager.id}
      managerName={manager.name}
      managerDisplayId={manager.accountId}
      records={records}
      structure={structure}
    />
  );
}
