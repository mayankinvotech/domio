import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getOwnedPortfolio } from '@/lib/portfolios';
import { resolveDataScope } from '@/lib/manager-access';
import PortfolioForm from '../../portfolio-form';

export default async function EditPortfolioPage({
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

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/portfolios"
        className="text-sm text-[#E8E8F2] transition-colors hover:text-white"
      >
        ← Back to Portfolios
      </Link>

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">
          Edit Portfolio
        </h1>
        <PortfolioForm
          mode="edit"
          portfolio={{
            id: portfolio.id,
            name: portfolio.name,
            type: portfolio.type,
            description: portfolio.description,
          }}
        />
      </div>
    </div>
  );
}
