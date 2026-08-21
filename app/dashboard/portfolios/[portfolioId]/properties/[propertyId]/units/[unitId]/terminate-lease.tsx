'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { useFocusTrap } from '@/hooks/use-focus-trap';

export default function TerminateLeaseButton({
  tenancyId,
}: {
  tenancyId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock scroll + close on Escape while the modal is open.
  useScrollLock(open);
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, pending]);

  async function terminate() {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/tenancies/${tenancyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'TERMINATED' }),
    });
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? 'Failed to terminate. Please try again.');
    }
    setPending(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="rounded-full border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
      >
        Terminate Lease
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!pending) setOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div
            ref={trapRef}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-[#312D58] bg-[#17152F] p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Terminate lease
            </h2>
            <p className="mt-2 text-sm text-[#E8E8F2]">
              Terminate this tenancy? The unit will be marked vacant. This cannot
              be undone.
            </p>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
              >
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!pending) setOpen(false);
                }}
                disabled={pending}
                className="rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={terminate}
                disabled={pending}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {pending ? 'Terminating…' : 'Terminate Lease'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
