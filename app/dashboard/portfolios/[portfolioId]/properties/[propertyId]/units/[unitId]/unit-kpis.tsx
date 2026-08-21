'use client';

import CountUp from 'react-countup';
import { motion } from 'framer-motion';

const cardClass =
  'rounded-2xl border border-[rgba(91,79,232,0.15)] bg-[rgba(14,12,34,0.6)] p-5 backdrop-blur-md ' +
  'shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ' +
  'transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(91,79,232,0.2)]';
const labelClass =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B6FE8]';

// Indian (en-IN) grouping — e.g. ₹10,98,000 (not ₹1,098,000).
const inrFormat = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

type Card = { label: string; value: number; color: string };

export default function UnitKpis({
  monthlyRent,
  totalExpected,
  totalReceived,
  rentOverdue,
  utilityPending,
  totalOutstanding,
}: {
  monthlyRent: number;
  totalExpected: number;
  totalReceived: number;
  rentOverdue: number;
  utilityPending: number;
  totalOutstanding: number;
}) {
  const cards: Card[] = [
    { label: 'Monthly Rent', value: monthlyRent, color: 'text-[#E8A020]' },
    { label: 'Total Expected', value: totalExpected, color: 'text-white' },
    { label: 'Total Received', value: totalReceived, color: 'text-[#8B6FE8]' },
    { label: 'Rent Overdue', value: rentOverdue, color: 'text-[#ef4444]' },
    { label: 'Utility Pending', value: utilityPending, color: 'text-[#E8A020]' },
    {
      label: 'Total Outstanding',
      value: totalOutstanding,
      color: totalOutstanding > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.1 }}
          className={cardClass}
        >
          <p className={labelClass}>{c.label}</p>
          <p className={'mt-2 text-xl font-bold ' + c.color}>
            <CountUp end={c.value} duration={1.5} formattingFn={inrFormat} />
          </p>
        </motion.div>
      ))}
    </div>
  );
}
