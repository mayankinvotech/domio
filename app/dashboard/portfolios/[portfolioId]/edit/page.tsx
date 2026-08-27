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
    <div className="mx-auto max-w-lg space-y-4">
      <Link
        href="/dashboard/portfolios"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
      >
        ← Back to Portfolios
      </Link>

      <div className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-8 shadow-xs">
        <h1 className="mb-6 text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
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
