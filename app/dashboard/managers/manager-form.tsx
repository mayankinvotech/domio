'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Initial = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  aiFullPortfolioRead: boolean;
};

const inputClass =
  'rounded-lg border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#B0B0C8] focus:border-zinc-700 focus:ring-2 focus:ring-zinc-500/20';
const labelClass = 'text-sm font-medium text-[#E8E8F2]';

export default function ManagerForm({
  mode,
  manager,
}: {
  mode: 'create' | 'edit';
  manager?: Initial;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const d = new FormData(event.currentTarget);
    const payload =
      mode === 'edit'
        ? {
            name: d.get('name'),
            phone: d.get('phone'),
            aiFullPortfolioRead: d.get('aiFullPortfolioRead') === 'on',
          }
        : {
            name: d.get('name'),
            email: d.get('email'),
            phone: d.get('phone'),
            password: d.get('password'),
          };

    const res = await fetch(
      mode === 'edit' ? `/api/managers/${manager!.id}` : '/api/managers',
      {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard/managers');
        router.refresh();
      }, 1000);
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
          Full Name
        </label>
        <input id="name" name="name" type="text" required defaultValue={manager?.name ?? ''} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required={mode === 'create'}
          disabled={mode === 'edit'}
          defaultValue={manager?.email ?? ''}
          className={inputClass + (mode === 'edit' ? ' opacity-60' : '')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className={labelClass}>
          Phone <span className="text-[#B0B0C8]">(optional)</span>
        </label>
        <input id="phone" name="phone" type="tel" defaultValue={manager?.phone ?? ''} className={inputClass} />
      </div>
      {mode === 'create' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className={labelClass}>
            Temporary Password
          </label>
          <input id="password" name="password" type="text" required className={inputClass} />
          <p className="text-xs text-[#6A6A8A]">
            Shared with the manager in their welcome email; they should change it
            on first login.
          </p>
        </div>
      )}

      {mode === 'edit' && (
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            id="aiFullPortfolioRead"
            name="aiFullPortfolioRead"
            type="checkbox"
            defaultChecked={manager?.aiFullPortfolioRead ?? false}
            className="mt-0.5 h-4 w-4 rounded border-[#312D58] bg-[rgba(255,255,255,0.06)] accent-[#18181b]"
          />
          <span className={labelClass}>
            Full portfolio visibility in Ask Domi
            <span className="mt-0.5 block text-xs font-normal text-[#6A6A8A]">
              When off, Ask Domi only answers about the units this manager is
              granted access to. When on, it can read data across the whole
              portfolio.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {success && (
        <p className="rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400">
          ✓ Manager saved successfully
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Manager'}
      </button>
    </form>
  );
}
