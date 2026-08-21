'use client';

// A small 📝 indicator that reveals the note text on hover. Renders nothing
// when there's no note. Used on property/unit cards and rent ledger rows.
export default function NotesIcon({
  notes,
  max = 100,
  className = '',
}: {
  notes: string | null | undefined;
  max?: number;
  className?: string;
}) {
  if (!notes || !notes.trim()) return null;
  const trimmed = notes.trim();
  const preview =
    trimmed.length > max ? trimmed.slice(0, max).trimEnd() + '…' : trimmed;

  return (
    <span className={'group/note relative inline-flex ' + className}>
      <span
        aria-label="Has notes"
        className="cursor-help text-xs leading-none"
      >
        📝
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 group-hover/note:block">
        <span className="block w-max max-w-[240px] whitespace-pre-wrap rounded-lg border border-[#1A1A2A] bg-[#0E0C22] px-3 py-2 text-left text-xs text-[#E8E8F2] shadow-xl">
          {preview}
        </span>
      </span>
    </span>
  );
}
