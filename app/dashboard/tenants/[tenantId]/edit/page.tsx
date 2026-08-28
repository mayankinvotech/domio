import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedTenant } from '@/lib/tenants';
import TenantForm from '../../tenant-form';

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { tenantId } = await params;
  const tenant = await getOwnedTenant(tenantId, session.user.id, session.user.role);
  if (!tenant) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/tenants"
        className="text-sm text-[#E8E8F2] transition-colors hover:text-white"
      >
        ← Back to Tenants
      </Link>

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">
          Edit Tenant
        </h1>
        <TenantForm
          mode="edit"
          tenant={{
            id: tenant.id,
            name: tenant.name,
            email: tenant.email,
            phone: tenant.phone,
            nationalId: tenant.nationalId,
            emergencyContactName: tenant.emergencyContactName,
            emergencyContactPhone: tenant.emergencyContactPhone,
            bankAccountNumber: tenant.bankAccountNumber,
            bankName: tenant.bankName,
          }}
          activeTenancy={
            tenant.tenancies[0]
              ? {
                  id: tenant.tenancies[0].id,
                  monthlyRent: tenant.tenancies[0].monthlyRent,
                  startDate: tenant.tenancies[0].startDate.toISOString().slice(0, 10),
                  endDate: tenant.tenancies[0].endDate.toISOString().slice(0, 10),
                  paymentDayOfMonth: tenant.tenancies[0].paymentDayOfMonth,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
