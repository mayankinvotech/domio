import Link from 'next/link';

type BreadcrumbItem = {
  label: string;
  href?: string; // undefined = current page (not clickable)
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-medium">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-zinc-300">/</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="text-zinc-500 transition-colors hover:text-zinc-900"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-zinc-900 font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
