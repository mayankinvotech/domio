'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PortfolioType } from '@prisma/client';
import { PORTFOLIO_TYPES } from '@/lib/portfolio-types';

type Initial = {
  id: string;
  name: string;
  type: PortfolioType;
  description: string | null;
};

const inputClass =
  'w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10';
const labelClass = 'text-xs font-bold uppercase tracking-wider text-zinc-700';

export default function PortfolioForm({
  mode,
  portfolio,
}: {
  mode: 'create' | 'edit';
  portfolio?: Initial;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: data.get('name'),
      type: data.get('type'),
      description: data.get('description'),
    };

    const res = await fetch(
      mode === 'edit' ? `/api/portfolios/${portfolio!.id}` : '/api/portfolios',
      {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (res.ok) {
      router.push('/dashboard/portfolios');
      router.refresh();
      return;
    }

    const json = await res.json().catch(() => null);
    setError(json?.error ?? 'Something went wrong. Please try again.');
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={portfolio?.name ?? ''}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="type" className={labelClass}>
          Type
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue={portfolio?.type ?? 'RESIDENTIAL'}
          className={inputClass}
        >
          {PORTFOLIO_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className={labelClass}>
          Description <span className="text-[#B0B0C8]">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={portfolio?.description ?? ''}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending
          ? 'Saving…'
          : mode === 'edit'
            ? 'Save Changes'
            : 'Create Portfolio'}
      </button>
    </form>
  );
}
