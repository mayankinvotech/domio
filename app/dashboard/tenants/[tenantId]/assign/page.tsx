import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedTenant } from '@/lib/tenants';
import { listVacantUnitsByProperty } from '@/lib/tenancies';
import AssignForm from './assign-form';

export default async function AssignTenantPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { tenantId } = await params;
  const tenant = await getOwnedTenant(tenantId, session.user.id, session.user.role);
  if (!tenant) notFound();

  const targetOwnerId = tenant.ownerId || session.user.id;
  const properties = await listVacantUnitsByProperty(targetOwnerId, session.user.role);

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href={`/dashboard/tenants/${tenantId}`}
        className="text-sm text-[#E8E8F2] transition-colors hover:text-white"
      >
        ← Back to {tenant.name}
      </Link>

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Assign to Unit
        </h1>
        <p className="mt-1 mb-6 text-sm text-[#B0B0C8]">
          Create a tenancy for {tenant.name}.
        </p>
        <AssignForm tenantId={tenantId} properties={properties} />
      </div>
    </div>
  );
}
