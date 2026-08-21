import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedProperty } from '@/lib/properties';
import { resolveDataScope } from '@/lib/manager-access';
import PropertyForm from '../../property-form';

export default async function EditPropertyPage({
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

  const listHref = `/dashboard/portfolios/${portfolioId}/properties`;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={listHref}
        className="text-sm text-[#E8E8F2] transition-colors hover:text-white"
      >
        ← Back to properties
      </Link>

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">
          Edit Property
        </h1>
        <PropertyForm
          mode="edit"
          portfolioId={portfolioId}
          property={{
            id: property.id,
            name: property.name,
            address: property.address,
            city: property.city,
            country: property.country,
            type: property.type,
            status: property.status,
            notes: property.notes,
          }}
        />
      </div>
    </div>
  );
}
