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
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        href={listHref}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900"
      >
        ← Back to properties
      </Link>

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
        <h1 className="mb-6 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
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
