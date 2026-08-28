import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedTenantDetail } from '@/lib/tenants';
import TenancyHistory, { type HistoryRow } from './tenancy-history';

import PortalAccessCard from './portal-access-card';

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <dt className="text-[#B0B0C8]">{label}</dt>
      <dd className="text-[#E8E8F2]">{value || '—'}</dd>
    </div>
  );
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { tenantId } = await params;
  const tenant = await getOwnedTenantDetail(tenantId, session.user.id, session.user.role);
  if (!tenant) notFound();

  const rows: HistoryRow[] = tenant.tenancies.map((t) => {
    const unitName = t.subProperty?.name ?? t.rentableEntity?.name ?? 'Unit';
    const unitNumber = t.subProperty?.unitNumber ?? t.rentableEntity?.code ?? '—';
    const portfolioId = t.subProperty?.property.portfolioId ?? t.rentableEntity?.property.portfolioId ?? '';
    const propertyId = t.subProperty?.propertyId ?? t.rentableEntity?.propertyId ?? '';
    return {
      id: t.id,
      status: t.status,
      startDate: t.startDate.toISOString(),
      endDate: t.endDate.toISOString(),
      monthlyRent: t.monthlyRent,
      unitName,
      unitNumber,
      unitHref: `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units`,
    };
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/tenants"
        className="text-sm text-[#E8E8F2] transition-colors hover:text-white"
      >
        ← Back to Tenants
      </Link>

      <div className="mt-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {tenant.name}
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/tenants/${tenant.id}/assign`}
            className="rounded-full border border-[#5B4FE8]/40 bg-[#5B4FE8]/15 px-4 py-2 text-sm font-medium text-[#8B6FE8] transition-colors hover:bg-[#5B4FE8]/25"
          >
            Assign to Unit
          </Link>
          <Link
            href={`/dashboard/tenants/${tenant.id}/edit`}
            className="rounded-full border border-[rgba(139,111,232,0.4)] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <dl className="rounded-2xl border border-[#312D58] bg-[#17152F] p-6 text-sm">
          <p className="mb-2 text-xs uppercase tracking-wide text-[#8B6FE8]">
            Contact &amp; Location
          </p>
          <InfoRow label="Email" value={tenant.email} />
          <InfoRow label="Phone" value={tenant.phone} />
          <InfoRow label="Location" value={tenant.location} />
          <InfoRow label="National ID" value={tenant.nationalId} />
        </dl>
        <dl className="rounded-2xl border border-[#312D58] bg-[#17152F] p-6 text-sm">
          <p className="mb-2 text-xs uppercase tracking-wide text-[#8B6FE8]">
            Emergency &amp; Bank
          </p>
          <InfoRow label="Emergency Contact" value={tenant.emergencyContactName} />
          <InfoRow label="Emergency Phone" value={tenant.emergencyContactPhone} />
          <InfoRow label="Bank" value={tenant.bankName} />
          <InfoRow label="Account" value={tenant.bankAccountNumber} />
        </dl>
      </div>

      <div className="mt-4">
        {(() => {
          const activeTenancy = tenant.tenancies.find((t) => t.status === 'ACTIVE') ?? tenant.tenancies[0];
          const propertyName =
            activeTenancy?.subProperty?.property
              ? (activeTenancy.subProperty as any).property.name ?? 'Property'
              : activeTenancy?.rentableEntity
                ? (activeTenancy.rentableEntity as any).property?.name ?? 'Property'
                : 'Property';
          const unitName =
            activeTenancy?.subProperty?.name ??
            activeTenancy?.rentableEntity?.name ??
            'Unit';
          return (
            <PortalAccessCard
              tenantId={tenant.id}
              phone={tenant.phone}
              initialEnabled={tenant.portalEnabled}
              tenantName={tenant.name}
              monthlyRent={activeTenancy?.monthlyRent ?? 0}
              propertyName={propertyName}
              unitName={unitName}
            />
          );
        })()}
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight text-white">
        Tenancy History
      </h2>
      <TenancyHistory rows={rows} />
    </div>
  );
}
