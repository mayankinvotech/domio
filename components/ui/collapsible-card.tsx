'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Matches the `glassCard` style used across the unit detail page.
const glassCard =
  'rounded-2xl border border-zinc-200 bg-[rgba(14,12,34,0.6)] backdrop-blur-md ' +
  'shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ' +
  'transition-shadow duration-200 hover:shadow-md';

function Chevron({ open }: { open: boolean }) {
  return (
    <motion.svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ rotate: open ? 180 : 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </motion.svg>
  );
}

// A glassmorphism card whose body collapses/expands with a height+fade
// animation. The `summary` row stays visible; `children` is the collapsible
// body. Starts collapsed by default (no persistence).
export default function CollapsibleCard({
  summary,
  children,
  className = '',
  defaultOpen = false,
  label,
  testId,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  label?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={glassCard + ' ' + className}
      data-testid={testId}
      data-open={open}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={label}
        data-testid={testId ? `${testId}-toggle` : undefined}
        className="flex w-full items-center justify-between gap-3 rounded-2xl p-6 text-left transition-colors hover:bg-zinc-50"
      >
        <div className="min-w-0 flex-1">{summary}</div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500">
          <Chevron open={open} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-6 pb-6" data-testid={testId ? `${testId}-body` : undefined}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
