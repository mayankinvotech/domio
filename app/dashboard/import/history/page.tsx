import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import HistoryClient from './history-client';

export default async function ImportHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const jobs = await prisma.importJob.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      displayId: true,
      importType: true,
      status: true,
      originalFileName: true,
      confirmedAt: true,
      rolledBackAt: true,
      createdAt: true,
      _count: { select: { importedRecords: true } },
    },
  });

  const rows = jobs.map(
    ({ _count, confirmedAt, rolledBackAt, createdAt, ...j }) => ({
      ...j,
      recordsCreated: _count.importedRecords,
      confirmedAt: confirmedAt ? confirmedAt.toISOString() : null,
      rolledBackAt: rolledBackAt ? rolledBackAt.toISOString() : null,
      createdAt: createdAt.toISOString(),
    }),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Import History
          </h1>
          <p className="mt-1 text-sm text-[#B0B0C8]">
            Every data import you have run. Completed imports can be rolled back
            within 30 days.
          </p>
        </div>
        <Link
          href="/dashboard/import"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          New Import
        </Link>
      </div>

      <div className="mt-8">
        <HistoryClient initialJobs={rows} />
      </div>
    </div>
  );
}
