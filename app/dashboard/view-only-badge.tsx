// Small badge shown to managers with view-only access on a page.
export default function ViewOnlyBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#312D58] bg-[rgba(255,255,255,0.06)] px-2.5 py-0.5 text-xs font-medium text-[#B0B0C8]">
      👁 View only
    </span>
  );
}
