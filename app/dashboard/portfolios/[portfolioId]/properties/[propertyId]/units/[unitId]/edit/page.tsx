import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedSubProperty } from '@/lib/sub-properties';
import { prisma } from '@/lib/prisma';
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

  let resolvedUnit: {
    id: string;
    name: string;
    unitNumber: string;
    floor: string | null;
    areaSqft: number | null;
    rentAmount: number;
    status: any;
    notes: string | null;
  } | null = null;

  if (unit && unit.propertyId === propertyId) {
    resolvedUnit = {
      id: unit.id,
      name: unit.name,
      unitNumber: unit.unitNumber,
      floor: unit.floor,
      areaSqft: unit.areaSqft,
      rentAmount: unit.rentAmount,
      status: unit.status,
      notes: unit.notes,
    };
  } else {
    const re = await prisma.rentableEntity.findFirst({
      where: { id: unitId, ownerId: ds.ownerId },
    });
    if (re && re.propertyId === propertyId) {
      resolvedUnit = {
        id: re.id,
        name: re.name,
        unitNumber: re.code,
        floor: null,
        areaSqft: re.areaSqft,
        rentAmount: re.rentAmount,
        status: re.status,
        notes: re.notes,
      };
    }
  }

  if (!resolvedUnit) notFound();

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
          unit={resolvedUnit}
        />
      </div>
    </div>
  );
}
