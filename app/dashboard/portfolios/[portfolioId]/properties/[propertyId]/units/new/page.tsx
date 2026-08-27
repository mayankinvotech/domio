import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedProperty, listPropertiesForPortfolio } from '@/lib/properties';
import { getOwnedPortfolio } from '@/lib/portfolios';
import { resolveDataScope } from '@/lib/manager-access';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import AddRentableEntityForm from '../rentable-entity-form';

export default async function NewUnitPage({
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

  const portfolioProperties = await listPropertiesForPortfolio(
    portfolioId,
    ds.ownerId,
    ds.isManager ? ds.scope : undefined,
  );

  const listHref = `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Breadcrumb
        items={[
          { label: 'Portfolios', href: '/dashboard/portfolios' },
          ...(portfolio
            ? [
                {
                  label: portfolio.name,
                  href: `/dashboard/portfolios?open=${portfolioId}`,
                },
              ]
            : []),
          { label: property.name, href: listHref },
          { label: 'Add Entity / Unit' },
        ]}
      />

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Add Rental Level / Entity
        </h1>
        <p className="mt-1 mb-6 text-xs text-zinc-500 font-medium">
          Choose the level you are listing (Whole Property, Floor, Room, or Bed) and optionally nest it under an existing parent entity.
        </p>

        <AddRentableEntityForm
          portfolioId={portfolioId}
          propertyId={propertyId}
          propertyName={property.name}
          propertyAddress={`${property.address}, ${property.city}`}
          properties={portfolioProperties.map((p) => ({
            id: p.id,
            name: p.name,
            address: `${p.address}, ${p.city}`,
          }))}
          listHref={listHref}
        />
      </div>
    </div>
  );
}
