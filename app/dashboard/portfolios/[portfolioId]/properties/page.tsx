import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedPortfolio } from '@/lib/portfolios';
import { listPropertiesForPortfolio } from '@/lib/properties';
import { resolveDataScope } from '@/lib/manager-access';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import PropertiesGrid from './properties-grid';
import TenantBalanceSummary from '@/components/dashboard/tenant-balance-summary';

export default async function PropertiesPage({
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

  const properties = await listPropertiesForPortfolio(
    portfolioId,
    ds.ownerId,
    ds.isManager ? ds.scope : undefined,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb
        items={[
          { label: 'Portfolios', href: '/dashboard/portfolios' },
          {
            label: portfolio.name,
            href: `/dashboard/portfolios?open=${portfolioId}`,
          },
          { label: 'Properties' },
        ]}
      />

      <PropertiesGrid
        portfolioId={portfolioId}
        portfolioName={portfolio.name}
        properties={properties}
      />

      <TenantBalanceSummary
        portfolioId={portfolioId}
        title={`Tenant Balances — ${portfolio.name}`}
      />
    </div>
  );
}
