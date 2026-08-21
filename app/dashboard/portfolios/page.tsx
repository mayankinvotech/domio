import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getPortfolioOverview } from '@/lib/portfolio-overview';
import { resolveDataScope } from '@/lib/manager-access';
import PortfolioAccordionList from './portfolio-accordion-list';

// Always read fresh prefs (unitsExpanded / unitsGroupBy) on each visit.
export const dynamic = 'force-dynamic';

export default async function PortfoliosPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const ds = await resolveDataScope(session.user);
  const portfolios = await getPortfolioOverview(
    ds.ownerId,
    ds.isManager ? ds.scope : undefined,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PortfolioAccordionList portfolios={portfolios} canManage={!ds.isManager} />
    </div>
  );
}
