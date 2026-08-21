'use client';

import Link from 'next/link';

export default function DomioFooter() {
  return (
    <footer className="border-t border-[#e1e2e3] bg-[#f5f5f7] py-12 text-sm text-zinc-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h4 className="font-bold text-black text-xs uppercase tracking-wider mb-3">
              Ledger & Tenancies
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/dashboard/rent" className="hover:text-black transition-colors">Rent Schedules</Link></li>
              <li><Link href="/dashboard/tenants" className="hover:text-black transition-colors">Tenant Directory</Link></li>
              <li><Link href="/dashboard/portfolios" className="hover:text-black transition-colors">Portfolios & Units</Link></li>
              <li><Link href="/dashboard/utilities" className="hover:text-black transition-colors">Utility Meters</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-black text-xs uppercase tracking-wider mb-3">
              Management & Admin
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/dashboard/documents" className="hover:text-black transition-colors">Document Vault</Link></li>
              <li><Link href="/dashboard/reports" className="hover:text-black transition-colors">Financial Statements</Link></li>
              <li><Link href="/dashboard/expenses" className="hover:text-black transition-colors">Expense Tracking</Link></li>
              <li><Link href="/dashboard/import" className="hover:text-black transition-colors">Data Import</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-black text-xs uppercase tracking-wider mb-3">
              AI Assistant
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/dashboard/ai-assistant" className="hover:text-black transition-colors">Ask Domi AI</Link></li>
              <li><Link href="/dashboard/audit-log" className="hover:text-black transition-colors">Audit Trail</Link></li>
              <li><Link href="/dashboard/settings/notifications" className="hover:text-black transition-colors">Settings & Alerts</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-black text-xs uppercase tracking-wider mb-3">
              Domio Platform
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Automated property management, tenant ledger reconciliation, and multi-unit portfolio oversight.
            </p>
            <div className="mt-4 flex items-center gap-1 font-bold text-black text-base">
              Domio <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 ml-0.5" />
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-zinc-200 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-3">
          <p>© {new Date().getFullYear()} Domio Technologies Inc. All rights reserved.</p>
          <p>Privacy Policy · Terms of Service · Security</p>
        </div>
      </div>
    </footer>
  );
}
