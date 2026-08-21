import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listPortfoliosForOwner } from '@/lib/portfolios';
import ImportWizard from './import-wizard';

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const portfolios = await listPortfoliosForOwner(session.user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Data Import
          </h1>
          <p className="mt-1 text-sm text-[#B0B0C8]">
            Bring historical property data into Domio from a spreadsheet.
          </p>
        </div>
        <Link
          href="/dashboard/import/history"
          className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white"
        >
          Import History
        </Link>
      </div>

      <div className="mt-8">
        <ImportWizard
          portfolios={portfolios.map((p) => ({
            id: p.id,
            name: p.name,
          }))}
        />
      </div>
    </div>
  );
}
