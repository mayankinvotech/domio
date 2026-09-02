import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listTenantsForOwner } from '@/lib/tenants';
import { resolveDataScope } from '@/lib/manager-access';
import TenantsGrid from './tenants-grid';
import Link from 'next/link';

export default async function TenantsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (
    session.user.role !== 'OWNER' &&
    session.user.role !== 'MANAGER' &&
    session.user.role !== 'SUPER_ADMIN'
  ) {
    redirect('/dashboard');
  }

  const ds = await resolveDataScope(session.user);
  const tenants = await listTenantsForOwner(
    ds.ownerId,
    ds.isManager ? ds.scope.subPropertyIds : undefined,
    session.user.role,
  );

  const totalTenants = tenants.length;
  const activeTenancies = tenants.filter(
    (t) => t.currentTenancy && t.currentTenancy.status === 'ACTIVE',
  ).length;
  const overdueTenants = tenants.filter(
    (t) => (t.currentTenancy?.currentBalance ?? 0) < 0,
  ).length;
  const unassignedTenants = tenants.filter((t) => !t.currentTenancy).length;

  return (
    <div className="min-h-full bg-[#fafaf9]">
      {/* ── Signature Dark Architectural Hero for Tenants ────────────────── */}
      <section className="relative overflow-hidden bg-zinc-950 py-12 sm:py-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.8), rgba(9, 9, 11, 0.98)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80')`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
                <span>👥</span>
                <span>Tenant & Lease Management</span>
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Tenant Directory
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-300 max-w-2xl font-normal">
                Manage your active tenancies, track arrears, store lease documents, and maintain direct tenant communications.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/tenant-portal/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
              >
                🔑 Open Tenant Portal
              </Link>
              <Link
                href="/dashboard/tenants/new"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition-all hover:bg-zinc-100 hover:scale-105 active:scale-95 shadow-lg"
              >
                <span>+</span> Add New Tenant
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar inside Hero */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Total Tenants
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">
                {totalTenants}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Active Leases
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">
                {activeTenancies}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                In Arrears
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-red-400">
                {overdueTenants}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Unassigned
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-zinc-300">
                {unassignedTenants}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Tenant Directory & Grid Below ────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <TenantsGrid tenants={tenants} />
      </div>
    </div>
  );
}
