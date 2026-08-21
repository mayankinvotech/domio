'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { Role } from '@prisma/client';
import Domi from '@/components/ai-assistant/domi';

const svgProps = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const Icons = {
  home: () => <svg {...svgProps}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>,
  rent: () => <svg {...svgProps}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="7" cy="15" r="1.5"/><path d="M14 15h4"/></svg>,
  tenants: () => <svg {...svgProps}><circle cx="9" cy="9" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 5.8"/><path d="M18.5 20a5 5 0 0 0-3-4.6"/></svg>,
  properties: () => <svg {...svgProps}><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h6M9 11h6M9 15h6"/></svg>,
  utilities: () => <svg {...svgProps}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  documents: () => <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/></svg>,
  reports: () => <svg {...svgProps}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  expenses: () => <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>,
  import: () => <svg {...svgProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  audit: () => <svg {...svgProps}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>,
  settings: () => <svg {...svgProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9z"/></svg>,
  managers: () => <svg {...svgProps}><circle cx="9" cy="9" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 5.8"/></svg>,
};

export default function HorizontalTopNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = [
    { href: '/dashboard', label: 'Home', icon: <Icons.home /> },
    ...(role === 'OWNER' || role === 'MANAGER' ? [
      { href: '/dashboard/rent', label: 'Rent Ledger', icon: <Icons.rent /> },
      { href: '/dashboard/tenants', label: 'Tenants', icon: <Icons.tenants /> },
      { href: '/dashboard/portfolios', label: 'Properties', icon: <Icons.properties /> },
      { href: '/dashboard/utilities', label: 'Utilities', icon: <Icons.utilities /> },
      { href: '/dashboard/documents', label: 'Documents', icon: <Icons.documents /> },
      { href: '/dashboard/reports', label: 'Reports', icon: <Icons.reports /> },
      { href: '/dashboard/expenses', label: 'Expenses', icon: <Icons.expenses /> },
    ] : []),
    ...(role === 'OWNER' ? [{ href: '/dashboard/import', label: 'Import', icon: <Icons.import /> }] : []),
    {
      href: '/dashboard/ai-assistant',
      label: 'Ask Domi',
      icon: <Domi size={15} mood="default" />,
      isAi: true,
    },
    ...(role === 'OWNER' ? [{ href: '/dashboard/managers', label: 'Managers', icon: <Icons.managers /> }] : []),
    ...(role === 'OWNER' || role === 'SUPER_ADMIN' ? [
      { href: '/dashboard/audit-log', label: 'Audit Log', icon: <Icons.audit /> },
      { href: '/dashboard/settings/notifications', label: 'Settings', icon: <Icons.settings /> },
    ] : []),
  ];

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
  }

  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [pathname]);

  return (
    <div className="mb-5 w-full rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div
        ref={scrollRef}
        className="flex items-center gap-0.5 overflow-x-auto no-scrollbar scroll-smooth px-2 py-1.5"
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                active
                  ? 'bg-zinc-900 text-white'
                  : (item as any).isAi
                    ? 'text-zinc-700 hover:bg-zinc-50'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
              }`}
            >
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {(item as any).isAi && !active && (
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
