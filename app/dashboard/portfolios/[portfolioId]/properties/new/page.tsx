import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedPortfolio } from '@/lib/portfolios';
import { resolveDataScope } from '@/lib/manager-access';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import PropertyForm from '../property-form';

export default async function NewPropertyPage({
  params,
}: {
  params: Promise<{ portfolioId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { portfolioId } = await params;
  const ds = await resolveDataScope(session.user);
  const portfolio = await getOwnedPortfolio(portfolioId, ds.ownerId);
  if (!portfolio) notFound();

  const listHref = `/dashboard/portfolios/${portfolioId}/properties`;

  return (
    <div className="mx-auto max-w-lg">
      <Breadcrumb
        items={[
          { label: 'Portfolios', href: '/dashboard/portfolios' },
          {
            label: portfolio.name,
            href: `/dashboard/portfolios?open=${portfolioId}`,
          },
          { label: 'Properties', href: listHref },
          { label: 'Add Property' },
        ]}
      />

      <div className="mt-4 rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
        <h1 className="mb-6 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Add Property
        </h1>
        <PropertyForm mode="create" portfolioId={portfolioId} />
      </div>
    </div>
  );
}
