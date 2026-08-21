'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function OwnerStatusToggle({
  id,
  active,
  onToggled,
}: {
  id: string;
  active: boolean;
  // When provided, the parent updates its own state with the new active value
  // (no full-page refresh). Otherwise we fall back to router.refresh().
  onToggled?: (active: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    setPending(true);
    setError(false);
    const res = await fetch(`/api/owners/${id}/status`, { method: 'PATCH' });
    if (res.ok) {
      if (onToggled) {
        const data = await res.json().catch(() => null);
        onToggled(data?.owner?.active ?? !active);
        setPending(false);
      } else {
        router.refresh();
      }
    } else {
      setError(true);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={error ? 'Failed — try again' : undefined}
      className={
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ' +
        (active
          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
          : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50')
      }
    >
      {pending ? '…' : active ? 'Deactivate' : 'Activate'}
    </button>
  );
}
