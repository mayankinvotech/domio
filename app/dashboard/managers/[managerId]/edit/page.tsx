import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedManager } from '@/lib/managers';
import ManagerForm from '../../manager-form';

export default async function EditManagerPage({
  params,
}: {
  params: Promise<{ managerId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { managerId } = await params;
  const manager = await getOwnedManager(managerId, session.user.id);
  if (!manager) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/managers"
        className="text-sm text-[#6A6A8A] transition-colors hover:text-white"
      >
        ← Back to Managers
      </Link>
      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">
          Edit Manager
        </h1>
        <ManagerForm
          mode="edit"
          manager={{
            id: manager.id,
            name: manager.name,
            email: manager.email,
            phone: manager.phone,
            aiFullPortfolioRead: manager.aiFullPortfolioRead,
          }}
        />
      </div>
    </div>
  );
}
