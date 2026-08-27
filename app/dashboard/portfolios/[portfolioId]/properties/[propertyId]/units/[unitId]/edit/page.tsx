import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedSubProperty } from '@/lib/sub-properties';
import { resolveDataScope } from '@/lib/manager-access';
import UnitForm from '../../unit-form';

export default async function EditUnitPage({
  params,
}: {
  params: Promise<{ portfolioId: string; propertyId: string; unitId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { portfolioId, propertyId, unitId } = await params;
  const ds = await resolveDataScope(session.user);
  const unit = await getOwnedSubProperty(unitId, ds.ownerId);
  if (!unit || unit.propertyId !== propertyId) notFound();

  const listHref = `/dashboard/portfolios/${portfolioId}/properties/${propertyId}/units`;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        href={listHref}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:text-zinc-900"
      >
        ← Back to units
      </Link>

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
        <h1 className="mb-6 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Edit Unit
        </h1>
        <UnitForm
          mode="edit"
          propertyId={propertyId}
          listHref={listHref}
          unit={{
            id: unit.id,
            name: unit.name,
            unitNumber: unit.unitNumber,
            floor: unit.floor,
            areaSqft: unit.areaSqft,
            rentAmount: unit.rentAmount,
            status: unit.status,
            notes: unit.notes,
          }}
        />
      </div>
    </div>
  );
}
