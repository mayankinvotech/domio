'use client';

import Link from 'next/link';
import type { Role } from '@prisma/client';

type HubBlock = {
  href: string;
  title: string;
  description: string;
  emoji: string;
  badge?: string;
};

export default function AppHubGrid({ role }: { role: Role }) {
  const blocks: HubBlock[] = [
    {
      href: '/dashboard/portfolios',
      title: 'Properties',
      description: 'Portfolios, buildings, units and rental property trees',
      emoji: '🏢',
    },
    {
      href: '/dashboard/tenants',
      title: 'Tenants',
      description: 'Tenant directory, lease terms, contact info and payment records',
      emoji: '👥',
    },
    {
      href: '/dashboard/rent',
      title: 'Rent Ledger',
      description: 'Monthly rent schedules, dues, collections and payment history',
      emoji: '💳',
      badge: 'Core',
    },
    {
      href: '/dashboard/utilities',
      title: 'Utilities',
      description: 'Water, electricity and internet meter bills and tracking',
      emoji: '⚡',
    },
    {
      href: '/dashboard/documents',
      title: 'Documents',
      description: 'Lease contracts, deeds, IDs and cloud file storage',
      emoji: '📁',
    },
    {
      href: '/dashboard/reports',
      title: 'Reports',
      description: 'Financial summaries, collection rates and PDF exports',
      emoji: '📊',
    },
    {
      href: '/dashboard/expenses',
      title: 'Expenses',
      description: 'Maintenance costs, insurance, vendor receipts and repairs',
      emoji: '🧾',
    },
    ...(role === 'OWNER' ? [{
      href: '/dashboard/import',
      title: 'Import Data',
      description: 'AI document reader and spreadsheet & bank statement import',
      emoji: '📥',
    }] : []),
    {
      href: '/dashboard/ai-assistant',
      title: 'Ask Domi AI',
      description: 'Intelligent assistant for rent calculations, balances and answers',
      emoji: '🤖',
      badge: 'AI',
    },
    ...(role === 'OWNER' ? [{
      href: '/dashboard/managers',
      title: 'Managers',
      description: 'Team roles, property access and manager delegation',
      emoji: '👔',
    }] : []),
    ...(role === 'OWNER' || role === 'SUPER_ADMIN' ? [
      {
        href: '/dashboard/audit-log',
        title: 'Audit Log',
        description: 'Immutable history of all ledger changes and account actions',
        emoji: '🕒',
      },
      {
        href: '/dashboard/settings/notifications',
        title: 'Settings',
        description: 'Notification preferences, alerts and account configuration',
        emoji: '⚙️',
      },
    ] : []),
  ];

  return (
    <section className="mt-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">
            What would you like to do?
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Select a module to get started
          </p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 font-medium text-xs text-zinc-600">
          {blocks.length} Modules
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {blocks.map((block) => (
          <Link
            key={block.href}
            href={block.href}
            className="group relative flex flex-col rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.98] sm:p-5"
            style={{ boxShadow: 'inset 0 0 0 1px transparent' }}
          >
            {/* Icon + badge row */}
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-2xl group-hover:scale-105 transition-transform">
                {block.emoji}
              </span>
              {block.badge && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider text-zinc-500">
                  {block.badge}
                </span>
              )}
            </div>

            {/* Title + description */}
            <h3 className="font-bold text-sm sm:text-base leading-snug text-zinc-900 group-hover:text-zinc-700 transition-colors">
              {block.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed line-clamp-2 text-zinc-500">
              {block.description}
            </p>

            {/* Arrow hint */}
            <div className="mt-auto pt-3 flex items-center justify-end">
              <span className="text-xs font-semibold text-zinc-400 transition-all group-hover:translate-x-0.5">
                Open →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
