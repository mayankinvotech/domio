import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedPortfolio } from '@/lib/portfolios';
import { getOwnedProperty } from '@/lib/properties';
import { listSubPropertiesForProperty } from '@/lib/sub-properties';
import { listRentableEntitiesForProperty } from '@/lib/rentable-entities';
import { resolveDataScope } from '@/lib/manager-access';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import UnitsGrid from './units-grid';
import TenantBalanceSummary from '@/components/dashboard/tenant-balance-summary';

export default async function UnitsPage({
  params,
}: {
  params: Promise<{ portfolioId: string; propertyId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { portfolioId, propertyId } = await params;
  const ds = await resolveDataScope(session.user);
  const property = await getOwnedProperty(propertyId, ds.ownerId);
  if (!property || property.portfolioId !== portfolioId) notFound();

  const portfolio = await getOwnedPortfolio(portfolioId, ds.ownerId);
  if (!portfolio) notFound();

  const [units, rentableEntities] = await Promise.all([
    listSubPropertiesForProperty(propertyId, ds.ownerId),
    listRentableEntitiesForProperty(propertyId, ds.ownerId),
  ]);

  const propsHref = `/dashboard/portfolios/${portfolioId}/properties`;

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb
        items={[
          { label: 'Portfolios', href: '/dashboard/portfolios' },
          {
            label: portfolio.name,
            href: `/dashboard/portfolios?open=${portfolioId}`,
          },
          { label: property.name, href: propsHref },
          { label: 'Units & Hierarchy' },
        ]}
      />

      <UnitsGrid
        portfolioId={portfolioId}
        propertyId={propertyId}
        propertyName={property.name}
        units={units}
        rentableEntities={rentableEntities}
      />

      <TenantBalanceSummary
        propertyId={propertyId}
        title={`Tenant Balances — ${property.name}`}
      />
    </div>
  );
}
