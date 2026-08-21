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

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.9)]">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">
          Add Property
        </h1>
        <PropertyForm mode="create" portfolioId={portfolioId} />
      </div>
    </div>
  );
}
