import Link from 'next/link';
import PortfolioForm from '../portfolio-form';

export default function NewPortfolioPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/dashboard/portfolios"
        className="text-sm text-[#E8E8F2] transition-colors hover:text-white"
      >
        ← Back to Portfolios
      </Link>

      <div className="mt-4 rounded-2xl border border-[#312D58] bg-[#17152F] p-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-white">
          Add Portfolio
        </h1>
        <PortfolioForm mode="create" />
      </div>
    </div>
  );
}
