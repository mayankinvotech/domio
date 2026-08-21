import Link from 'next/link';

const arrow =
  'flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-base font-bold leading-none text-zinc-600 transition-all hover:bg-zinc-50 hover:text-zinc-900 active:scale-95 shadow-sm';

// Month navigation for the dashboard. Pure links → keeps the page server-rendered
// (URL params drive the data). `nextHref` is null when already at the current
// month (no navigating into the future).
export default function MonthPicker({
  label,
  prevHref,
  nextHref,
  currentHref,
  showCurrent,
}: {
  label: string;
  prevHref: string;
  nextHref: string | null;
  currentHref: string;
  showCurrent: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
      {showCurrent && (
        <Link
          href={currentHref}
          className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-200"
        >
          Current
        </Link>
      )}
      <Link href={prevHref} aria-label="Previous month" className={arrow}>
        ‹
      </Link>
      <span
        className="min-w-[110px] px-2 text-center text-xs sm:text-sm font-semibold text-zinc-900"
        data-testid="month-label"
      >
        {label}
      </span>
      {nextHref ? (
        <Link href={nextHref} aria-label="Next month" className={arrow}>
          ›
        </Link>
      ) : (
        <span
          aria-label="Next month"
          aria-disabled="true"
          className={arrow + ' cursor-not-allowed opacity-30'}
        >
          ›
        </span>
      )}
    </div>
  );
}
