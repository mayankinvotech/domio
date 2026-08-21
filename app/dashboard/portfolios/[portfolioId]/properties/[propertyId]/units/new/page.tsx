import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedProperty } from '@/lib/properties';
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

  const listHref = `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units`;

  return (
    <div className="mx-auto max-w-xl">
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

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white">
          Add Rental Level / Entity
        </h1>
        <p className="mb-6 text-xs text-[#B0B0C8]">
          Choose the level you are listing (Whole Property, Floor, Room, or Bed) and optionally nest it under an existing parent entity.
        </p>

        <AddRentableEntityForm propertyId={propertyId} listHref={listHref} />
      </div>
    </div>
  );
}
