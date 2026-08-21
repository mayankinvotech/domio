import { Suspense } from 'react';
import Link from 'next/link';
import TenantForm from '../tenant-form';

export default function NewTenantPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href="/dashboard/tenants"
        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 shadow-xs"
      >
        ← Back to Tenants
      </Link>

      <div className="mt-4 rounded-2xl border border-[#e1e2e3] bg-white p-8 shadow-xs">
        <h1 className="mb-6 text-2xl font-bold tracking-tight text-zinc-900">
          Add New Tenant
        </h1>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-100" />}>
          <TenantForm mode="create" />
        </Suspense>
      </div>
    </div>
  );
}
