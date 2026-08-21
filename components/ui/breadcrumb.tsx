import Link from 'next/link';

type BreadcrumbItem = {
  label: string;
  href?: string; // undefined = current page (not clickable)
};

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-[#4A4A6A]">›</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[#6A6A8A] transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[#E8E8F2]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
