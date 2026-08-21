'use client';

import { useTheme, type Theme } from '@/lib/theme-context';

const OPTIONS: {
  id: Theme;
  label: string;
  desc: string;
  // Preview swatch colours (static — they illustrate each theme).
  page: string;
  card: string;
  text: string;
  accent: string;
}[] = [
  {
    id: 'dark',
    label: 'Dark',
    desc: 'Void black surfaces — the Domio default.',
    page: '#0A0A0F',
    card: '#17152F',
    text: '#FFFFFF',
    accent: '#18181b',
  },
  {
    id: 'light',
    label: 'Light',
    desc: 'Bright surfaces with violet accents.',
    page: '#FFFFFF',
    card: '#F0EEFB',
    text: '#1A1825',
    accent: '#18181b',
  },
];

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function ThemeSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        Appearance
      </h2>
      <p className="mt-1 text-sm text-[#6A6A8A]">
        Choose how Domio looks. Your choice is saved to your account.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {OPTIONS.map((o) => {
          const selected = theme === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setTheme(o.id)}
              aria-pressed={selected}
              data-testid={`theme-card-${o.id}`}
              className={
                'group rounded-2xl border-2 p-4 text-left transition-colors ' +
                (selected
                  ? 'border-zinc-700 bg-zinc-50'
                  : 'border-[#312D58] hover:border-[#71717a]')
              }
            >
              {/* Mini preview */}
              <div
                className="mb-3 overflow-hidden rounded-xl border"
                style={{ background: o.page, borderColor: o.card }}
              >
                <div className="flex gap-2 p-3">
                  <div className="h-12 w-10 rounded-md" style={{ background: o.card }} />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-2 w-2/3 rounded" style={{ background: o.text, opacity: 0.85 }} />
                    <div className="h-2 w-1/2 rounded" style={{ background: o.text, opacity: 0.4 }} />
                    <div className="h-4 w-16 rounded" style={{ background: o.accent }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{o.label}</p>
                  <p className="text-xs text-[#6A6A8A]">{o.desc}</p>
                </div>
                <span
                  className={
                    'flex h-6 w-6 items-center justify-center rounded-full ' +
                    (selected ? 'bg-zinc-900 text-white' : 'text-[#4A4A6A]')
                  }
                  data-testid={selected ? `theme-card-${o.id}-check` : undefined}
                >
                  {selected ? <CheckIcon /> : null}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
