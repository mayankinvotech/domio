'use client';

import Link from 'next/link';

export default function DomioFeatures() {
  const features = [
    {
      title: 'Fewer days on the market',
      description:
        'We have thousands of active tenant records ready and waiting for automated lease assignments and instant digital agreements.',
      link: '/dashboard/tenants',
      action: 'Explore Tenants',
    },
    {
      title: 'Fairer fees & transparent ledger',
      description:
        'Zero hidden charges. Get complete double-entry financial clarity with live receipts, expenses, and automated collection rates.',
      link: '/dashboard/rent',
      action: 'View Rent Ledger',
    },
    {
      title: 'Multi-portfolio & unit hierarchy',
      description:
        'From single flats to multi-building commercial portfolios, organize every sub-property and meter account in one place.',
      link: '/dashboard/portfolios',
      action: 'Browse Properties',
    },
  ];

  return (
    <section className="bg-[#fafaf9] py-16 sm:py-20 border-b border-[#e1e2e3]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">
            Why landlords choose Domio?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-zinc-600">
            Intelligent management tools tailored for modern property owners.
          </p>
        </div>

        {/* 3 Large White Cards */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex flex-col justify-between rounded-2xl border border-[#e1e2e3] bg-white p-7 shadow-xs transition-all hover:shadow-md hover:border-zinc-300"
            >
              <div>
                <h3 className="text-xl font-bold text-black">{f.title}</h3>
                <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
                  {f.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100">
                <Link
                  href={f.link}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-black transition-colors hover:text-zinc-700"
                >
                  {f.action} →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Partner / Portals Bar */}
        <div className="mt-16 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Your property, everywhere
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-14 opacity-70 font-semibold text-lg text-zinc-600">
            <span className="font-bold tracking-tight">rightmove<span className="text-emerald-500">^</span></span>
            <span className="font-bold tracking-tight text-purple-700">Zoopla</span>
            <span className="font-bold tracking-tight text-teal-600">OnTheMarket</span>
            <span className="font-bold tracking-tight text-zinc-700">facebook</span>
          </div>
        </div>
      </div>
    </section>
  );
}
