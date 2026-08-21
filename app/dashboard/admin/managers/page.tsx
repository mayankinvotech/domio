import { listAllManagers } from '@/lib/managers';

export default async function AdminManagersPage() {
  const managers = await listAllManagers();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Property Managers
        </h1>
      </div>

      <p className="mt-1 text-sm text-[#E8E8F2]">
        {managers.length} manager{managers.length === 1 ? '' : 's'} across all
        owners
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#1A1A2A]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-[#312D58] bg-[#242140] text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Account ID</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Assigned Properties</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {managers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-[#6A6A8A]">
                  No property managers yet.
                </td>
              </tr>
            ) : (
              managers.map((m) => (
                <tr key={m.id} className="border-t border-[#1A1A2A]">
                  <td className="px-5 py-3 font-medium text-white">
                    {m.name}
                    <span className="ml-2 text-xs text-[#6A6A8A]">
                      · {m.ownerName}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-zinc-500">
                    {m.displayId ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-[#E8E8F2]">{m.email}</td>
                  <td className="px-5 py-3">
                    {m.active ? (
                      <span className="inline-flex items-center rounded-full border border-zinc-700/30 bg-zinc-900/15 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[#E8E8F2]">{m.accessCount}</td>
                  <td className="px-5 py-3 text-right text-[#6A6A8A]">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
