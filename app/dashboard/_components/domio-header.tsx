'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import type { Role } from '@prisma/client';

function getInitials(name: string, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function DomioHeader({
  role,
  email,
  name,
  signOutAction,
}: {
  role: Role;
  email: string;
  name?: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = getInitials(name ?? '', email);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on navigation
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#e1e2e3] bg-white">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-1 group">
          <span className="font-sans text-2xl font-bold tracking-tight text-black transition-colors group-hover:text-zinc-700">
            Domio
          </span>
        </Link>

        {/* Right: User Menu Pill + Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {/* User Menu Pill Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 rounded-full border border-[#e1e2e3] bg-white p-1.5 pl-3.5 transition-shadow hover:shadow-md active:scale-95"
              aria-label="User menu"
              aria-expanded={dropdownOpen}
            >
              {/* 3-bar hamburger icon inside the pill */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              {/* Circular Avatar */}
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 font-sans text-xs font-semibold text-white">
                {initials}
              </div>
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-[#e1e2e3] bg-white p-2 shadow-2xl z-50">
                <div className="border-b border-zinc-100 px-3.5 py-3">
                  <p className="font-semibold text-sm text-zinc-900 truncate">
                    {name || email.split('@')[0]}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{email}</p>
                  <span className="mt-1.5 inline-block rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                    {role}
                  </span>
                </div>

                <div className="py-1.5">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <span>🏠</span> Home Overview
                  </Link>
                  <Link
                    href="/dashboard/search"
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <span>🔍</span> Property Search & Map
                  </Link>
                  <Link
                    href="/dashboard/portfolios"
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <span>🏢</span> Properties & Units
                  </Link>
                  <Link
                    href="/dashboard/utilities"
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <span>⚡</span> Utility Tracking
                  </Link>
                  <Link
                    href="/dashboard/documents"
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <span>📁</span> Document Vault
                  </Link>
                  <Link
                    href="/dashboard/reports"
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <span>📊</span> Reports & Statements
                  </Link>
                  <Link
                    href="/dashboard/expenses"
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <span>🧾</span> Expenses & Repairs
                  </Link>
                  {role === 'OWNER' && (
                    <Link
                      href="/dashboard/import"
                      className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                    >
                      <span>📥</span> Import Data
                    </Link>
                  )}
                  <Link
                    href="/dashboard/ai-assistant"
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                  >
                    <span>🤖</span> Ask Domi AI
                  </Link>
                  {(role === 'OWNER' || role === 'SUPER_ADMIN') && (
                    <>
                      <Link
                        href="/dashboard/audit-log"
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        <span>🕒</span> Audit Log
                      </Link>
                      <Link
                        href="/dashboard/settings/notifications"
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        <span>⚙️</span> Settings
                      </Link>
                    </>
                  )}
                </div>

                <div className="border-t border-zinc-100 pt-1.5">
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <span>🚪</span> Log out
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
