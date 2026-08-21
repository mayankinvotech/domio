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
    <div className="mx-auto max-w-lg">
      <Link
        href={listHref}
        className="text-sm text-[#E8E8F2] transition-colors hover:text-white"
      >
        ← Back to units
      </Link>

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">
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
