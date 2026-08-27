'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Role } from '@prisma/client';
import Domi from '@/components/ai-assistant/domi';
import { useTheme } from '@/lib/theme-context';

const svgProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function HouseIcon() {
  return (
    <svg {...svgProps}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
  );
}
function BuildingIcon() {
  return (
    <svg {...svgProps}><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h6M9 11h6M9 15h6"/></svg>
  );
}
function PeopleIcon() {
  return (
    <svg {...svgProps}><circle cx="9" cy="9" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6.5a3 3 0 0 1 0 5.8"/><path d="M18.5 20a5 5 0 0 0-3-4.6"/></svg>
  );
}
function RentIcon() {
  return (
    <svg {...svgProps}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><circle cx="7" cy="15" r="1.5"/><path d="M14 15h4"/></svg>
  );
}
function ExpenseIcon() {
  return (
    <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
  );
}
function UtilityIcon() {
  return (
    <svg {...svgProps}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  );
}
function DocIcon() {
  return (
    <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/></svg>
  );
}
function ReportsIcon() {
  return (
    <svg {...svgProps}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  );
}
function ImportIcon() {
  return (
    <svg {...svgProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  );
}
function AuditIcon() {
  return (
    <svg {...svgProps}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
  );
}
function SettingsIcon() {
  return (
    <svg {...svgProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9z"/></svg>
  );
}
function SunIcon() {
  return (
    <svg {...svgProps}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  );
}
function MoonIcon() {
  return (
    <svg {...svgProps}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
  );
}
function LogoutIcon() {
  return (
    <svg {...svgProps}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  );
}
function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dir === 'left' ? <path d="M15 18l-6-6 6-6"/> : <path d="M9 18l6-6-6-6"/>}
    </svg>
  );
}

function getInitials(name: string, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

type NavSection = {
  title?: string;
  items: { href: string; label: string; icon: React.ReactNode; isAi?: boolean }[];
};

const COLLAPSE_KEY = 'domio-sidebar-collapsed';

export default function DashboardSidebar({
  role,
  email,
  name,
  portfolioCount = 0,
  accountId,
  signOutAction,
}: {
  role: Role;
  email: string;
  name?: string;
  portfolioCount?: number;
  accountId: string | null;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === '1') setCollapsed(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch {}
      return next;
    });
  }

  function isActive(href: string) {
    return href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
  }

  const sections: NavSection[] = [
    {
      title: 'MAIN',
      items: [
        { href: '/dashboard', label: 'Home', icon: <HouseIcon /> },
        ...(role === 'OWNER' || role === 'MANAGER' ? [
          { href: '/dashboard/rent', label: 'Rent Ledger', icon: <RentIcon /> },
          { href: '/dashboard/tenants', label: 'Tenants', icon: <PeopleIcon /> },
          { href: '/dashboard/portfolios', label: 'Properties', icon: <BuildingIcon /> },
          { href: '/dashboard/utilities', label: 'Utilities', icon: <UtilityIcon /> },
          { href: '/dashboard/documents', label: 'Documents', icon: <DocIcon /> },
          { href: '/dashboard/reports', label: 'Reports', icon: <ReportsIcon /> },
          { href: '/dashboard/expenses', label: 'Expenses', icon: <ExpenseIcon /> },
        ] : []),
        ...(role === 'OWNER' ? [
          { href: '/dashboard/import', label: 'Import', icon: <ImportIcon /> },
        ] : []),
        ...(role === 'SUPER_ADMIN' ? [
          { href: '/dashboard/owners', label: 'Property Owners', icon: <PeopleIcon /> },
          { href: '/dashboard/admin/managers', label: 'Managers', icon: <PeopleIcon /> },
        ] : []),
      ],
    },
    {
      title: 'ASSISTANT',
      items: [
        { href: '/dashboard/ai-assistant', label: 'Ask Domi AI', icon: <Domi size={18} mood="default" />, isAi: true },
      ],
    },
    {
      title: 'AGENTS & MARKETPLACE',
      items: [
        { href: '/dashboard/requests', label: '🔔 Requests Inbox', icon: <PeopleIcon /> },
        { href: '/dashboard/agents', label: 'Hire an Agent', icon: <PeopleIcon /> },
        { href: '/dashboard/agent', label: 'Work as Agent', icon: <BuildingIcon /> },
      ],
    },
    {
      title: 'ADMIN',
      items: [
        ...(role === 'OWNER' ? [{ href: '/dashboard/managers', label: 'Managers', icon: <PeopleIcon /> }] : []),
        ...(role === 'OWNER' || role === 'SUPER_ADMIN' ? [
          { href: '/dashboard/audit-log', label: 'Audit Log', icon: <AuditIcon /> },
          { href: '/dashboard/settings/notifications', label: 'Settings', icon: <SettingsIcon /> },
        ] : []),
      ],
    },
  ];

  const mobileDockItems = [
    { href: '/dashboard', label: 'Home', icon: <HouseIcon /> },
    { href: '/dashboard/rent', label: 'Rent', icon: <RentIcon /> },
    { href: '/dashboard/tenants', label: 'Tenants', icon: <PeopleIcon /> },
    { href: '/dashboard/portfolios', label: 'Properties', icon: <BuildingIcon /> },
    { href: '/dashboard/ai-assistant', label: 'Ask Domi', icon: <Domi size={16} mood="default" />, isAi: true },
  ];

  function navItemClass(active: boolean, isAi?: boolean) {
    const base = 'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ' +
      (collapsed ? 'lg:justify-center lg:gap-0 lg:px-2 ' : '');
    // AI items use the same zinc styling — no special blue treatment.
    return base + (active
      ? 'bg-zinc-900 text-white font-semibold'
      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900');
  }

  const showLabel = collapsed ? 'lg:hidden' : '';
  const initials = getInitials(name ?? '', email);
  const roleLabel = role === 'OWNER' ? 'Owner' : role === 'MANAGER' ? 'Manager' : 'Admin';
  const roleSubtitle = role === 'OWNER' && portfolioCount > 0
    ? `${roleLabel} · ${portfolioCount} portfolio${portfolioCount > 1 ? 's' : ''}`
    : roleLabel;

  return (
    <>
      {/* ── Mobile Top Bar ────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 backdrop-blur-md px-4 lg:hidden shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 active:scale-95 hover:border-zinc-300 hover:text-zinc-800 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-900 font-bold text-white text-sm">
              D
            </div>
            <span className="font-bold text-base text-zinc-900 tracking-tight">Domio</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleTheme} aria-label="Toggle theme" className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500">
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 font-semibold text-xs text-white">
            {initials}
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Navigation Dock ─────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-zinc-200 bg-white/95 backdrop-blur-lg px-2 lg:hidden">
        {mobileDockItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all active:scale-90 min-w-[52px] ${
                active ? 'text-zinc-900 font-bold' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              <div className={`relative flex h-6 w-6 items-center justify-center ${active ? 'scale-110' : ''}`}>
                {item.icon}
                {active && <span className="absolute -top-1 right-0 h-1.5 w-1.5 rounded-full bg-zinc-900" />}
              </div>
              <span className="mt-0.5 text-[10px]">{item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-zinc-400 active:scale-90 transition-all min-w-[52px]"
        >
          <div className="flex h-6 w-6 items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </div>
          <span className="mt-0.5 text-[10px]">More</span>
        </button>
      </nav>

      {/* Backdrop */}
      {mobileOpen && (
        <div aria-hidden onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Main Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={
          'flex shrink-0 flex-col justify-between border-r border-zinc-200 bg-white transition-all duration-250 ' +
          'fixed inset-y-0 left-0 z-50 lg:static lg:z-auto lg:translate-x-0 ' +
          (mobileOpen ? 'translate-x-0 ' : '-translate-x-full ') +
          (collapsed ? 'w-64 p-3 lg:w-[60px] lg:p-2' : 'w-64 p-4')
        }
      >
        <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">

          {/* Logo + Collapse */}
          <div className={`flex items-center justify-between pb-4 border-b border-zinc-100 ${collapsed ? 'lg:flex-col lg:items-center lg:gap-2' : ''}`}>
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 font-bold text-white text-base">
                D
              </div>
              <div className={collapsed ? 'lg:hidden' : ''}>
                <span className="font-bold text-lg text-zinc-900 tracking-tight">Domio</span>
                <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-[10px] text-zinc-600">PRO</span>
              </div>
            </Link>

            {/* Desktop collapse toggle */}
            <button type="button" onClick={toggle} aria-label={collapsed ? 'Expand' : 'Collapse'}
              className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-400 hover:border-zinc-300 hover:text-zinc-700 transition-colors lg:flex"
            >
              <ChevronIcon dir={collapsed ? 'right' : 'left'} />
            </button>

            {/* Mobile close */}
            <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-400 lg:hidden"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>

          {/* Navigation Sections */}
          <nav className="mt-4 flex flex-col gap-5">
            {sections.map((sec, idx) => {
              if (!sec.items?.length) return null;
              return (
                <div key={sec.title ?? idx} className="flex flex-col gap-0.5">
                  {sec.title && (
                    <span className={`px-3 pb-1 font-semibold text-[10px] uppercase tracking-widest text-zinc-400 ${showLabel}`}>
                      {sec.title}
                    </span>
                  )}
                  {sec.items.map(item => (
                    <Link key={item.href} href={item.href} aria-label={item.label}
                      className={navItemClass(isActive(item.href), item.isAi)}
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {item.icon}
                      </span>
                      <span className={`truncate ${showLabel}`}>{item.label}</span>
                      {item.isAi && !collapsed && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-zinc-400" />
                      )}
                    </Link>
                  ))}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Bottom profile card */}
        <div className="mt-auto pt-4 border-t border-zinc-100">
          <div className={`flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 ${collapsed ? 'lg:justify-center lg:p-1.5' : ''}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 font-semibold text-xs text-white">
                {initials}
              </div>
              <div className={`min-w-0 ${showLabel}`}>
                <p className="truncate text-xs font-semibold text-zinc-900">{name || email.split('@')[0]}</p>
                <p className="truncate text-[10px] text-zinc-500">{roleSubtitle}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <button type="button" onClick={toggleTheme} data-testid="theme-toggle" aria-label="Toggle Theme"
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              <form action={signOutAction}>
                <button type="submit" aria-label="Sign Out"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <LogoutIcon />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
