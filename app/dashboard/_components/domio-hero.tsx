'use client';

import Link from 'next/link';

const svgProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function RentIcon() {
  return (
    <svg {...svgProps}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="7" cy="15" r="1.5" />
      <path d="M14 15h4" />
    </svg>
  );
}

function TenantIcon() {
  return (
    <svg {...svgProps}>
      <path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10z" />
      <circle cx="12" cy="13" r="2.5" />
      <path d="M8.5 19a3.5 3.5 0 0 1 7 0" />
    </svg>
  );
}

function PropertyIcon() {
  return (
    <svg {...svgProps}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 7h6M9 11h6M9 15h6" />
    </svg>
  );
}

function UtilityIcon() {
  return (
    <svg {...svgProps}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15h6" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg {...svgProps}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg {...svgProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

export default function DomioHero() {
  const cards = [
    {
      href: '/dashboard/portfolios',
      title: 'View all properties',
      icon: <PropertyIcon />,
    },
    {
      href: '/dashboard/tenants',
      title: 'Looking for a tenant',
      icon: <TenantIcon />,
    },
    {
      href: '/dashboard/rent',
      title: 'Manage my rent ledger',
      icon: <RentIcon />,
    },
    {
      href: '/dashboard/utilities',
      title: 'Track utility bills',
      icon: <UtilityIcon />,
    },
    {
      href: '/dashboard/documents',
      title: 'Lease agreements & vault',
      icon: <DocumentIcon />,
    },
    {
      href: '/dashboard/reports',
      title: 'Financial statements',
      icon: <ReportIcon />,
    },
    {
      href: '/dashboard/expenses',
      title: 'Log repairs & expenses',
      icon: <ExpenseIcon />,
    },
  ];

  return (
    <section className="relative overflow-hidden bg-zinc-950 py-16 sm:py-24 text-white">
      {/* Background Dark Architectural Texture */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.8), rgba(9, 9, 11, 0.98)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80')`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white">
          Domio Property Management
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-zinc-300 font-normal">
          What would you like to do?
        </p>

        {/* Horizontal Action Cards Row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col items-center justify-center rounded-xl border border-white/25 bg-black/40 px-4 py-5 backdrop-blur-md transition-all hover:border-white/70 hover:bg-black/60 hover:scale-105 active:scale-95 min-w-[140px] sm:min-w-[155px] max-w-[170px]"
            >
              <div className="flex h-12 w-12 items-center justify-center text-white transition-transform group-hover:scale-110">
                {card.icon}
              </div>
              <span className="mt-3 text-center text-xs font-semibold leading-snug text-white">
                {card.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
