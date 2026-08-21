'use client';

export type View = 'card' | 'table';

const baseBtn =
  'flex h-8 w-8 items-center justify-center rounded-md transition-all';
const activeBtn = 'bg-zinc-900 text-white shadow-sm';
const inactiveBtn = 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100';

export default function ViewToggle({
  view,
  onChange,
}: {
  view: View;
  onChange: (view: View) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange('card')}
        aria-pressed={view === 'card'}
        aria-label="Card view"
        title="Card view"
        className={`${baseBtn} ${view === 'card' ? activeBtn : inactiveBtn}`}
      >
        {/* grid / card icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={view === 'table'}
        aria-label="Table view"
        title="Table view"
        className={`${baseBtn} ${view === 'table' ? activeBtn : inactiveBtn}`}
      >
        {/* list / table icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="3" y="5" width="18" height="2.5" rx="1.25" />
          <rect x="3" y="10.75" width="18" height="2.5" rx="1.25" />
          <rect x="3" y="16.5" width="18" height="2.5" rx="1.25" />
        </svg>
      </button>
    </div>
  );
}
