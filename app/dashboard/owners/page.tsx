import Link from 'next/link';
import { listOwners } from '@/lib/owners';
import OwnersTable from './owners-table';

export default async function OwnersPage() {
  const owners = await listOwners();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Property Owners
        </h1>
        <Link
          href="/dashboard/owners/new"
          className="rounded-full border border-zinc-300 bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
        >
          Add Owner
        </Link>
      </div>

      <OwnersTable owners={owners} />
    </div>
  );
}
