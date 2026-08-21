import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUnitDetail } from '@/lib/unit-detail';
import { formatMoney, formatDate } from '@/lib/tenancy-types';
import {
  subPropertyStatusBadgeClass,
  subPropertyStatusLabel,
} from '@/lib/sub-property-types';
import { propertyTypeLabel } from '@/lib/property-types';
import {
  expenseCategoryBadgeClass,
  expenseCategoryLabel,
} from '@/lib/expense-types';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import CollapsibleCard from '@/components/ui/collapsible-card';
import LedgerEntryTable from '@/components/rent/ledger-entry-table';
import RentStatementButton from '@/components/reports/rent-statement-button';
import UnitUtilityAccounts from './unit-utility-accounts';
import TerminateLeaseButton from './terminate-lease';
import UnitNotesSection from './unit-notes-section';
import UnitFloorEditor from './unit-floor-editor';
import UnitDocuments from './unit-documents';
import { listDocumentsForOwner } from '@/lib/documents';
import { resolveDataScope } from '@/lib/manager-access';
import { FadeIn, Reveal } from './motion';
import LeaseBanner, { type LeaseBannerState } from './lease-banner';
import UnitKpis from './unit-kpis';

const dayMs = 1000 * 60 * 60 * 24;

const glassCard =
  'rounded-2xl border border-[rgba(91,79,232,0.15)] bg-[rgba(14,12,34,0.6)] backdrop-blur-md ' +
  'shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] ' +
  'transition-shadow duration-200 hover:shadow-[0_0_32px_rgba(91,79,232,0.2)]';
const sectionLabel =
  'text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8B6FE8]';
const divider = 'my-4 border-t border-[rgba(91,79,232,0.15)]';
const addBtn =
  'inline-flex min-h-[36px] items-center rounded-full border border-[#5B4FE8]/40 bg-[#5B4FE8]/15 px-3 py-1.5 text-xs font-medium text-[#8B6FE8] transition-colors hover:bg-[#5B4FE8]/25';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function monthsInclusive(start: Date, end: Date): number {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) +
    1
  );
}

function initialsFrom(name: string): string {
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function InfoRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-[#6A6A8A]">{label}</dt>
      <dd className={muted ? 'text-[#4A4A6A]' : 'text-white'}>{value}</dd>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#8B6FE8]" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[#8B6FE8]" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ portfolioId: string; propertyId: string; unitId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const { portfolioId, propertyId, unitId } = await params;
  // Managers read the owner's data, but only for units they're granted.
  const ds = await resolveDataScope(session.user);
  if (ds.isManager && !ds.scope.subPropertyIds.includes(unitId)) {
    notFound();
  }
  const detail = await getUnitDetail(unitId, ds.ownerId);
  if (
    !detail ||
    detail.unit.propertyId !== propertyId ||
    detail.unit.portfolioId !== portfolioId
  ) {
    notFound();
  }

  const { unit, tenancy, rentLedger, utilityAccounts, expenses, utilityPending } =
    detail;
  // Owner → always; manager → only with the rent-ledger right on this unit.
  const canEditRent =
    !ds.isManager || ds.scope.rentEditSubPropertyIds.has(unitId);
  const propsHref = `/dashboard/portfolios/${portfolioId}/properties`;
  const unitsHref = `${propsHref}/${propertyId}/units`;

  // Documents linked to this unit.
  const documents = await listDocumentsForOwner(ds.ownerId, {
    entityType: 'SUB_PROPERTY',
    entityId: unitId,
  });
  const unitLabel = `Unit ${unit.unitNumber}${unit.displayId ? ` · ${unit.displayId}` : ''}`;

  // ── Lease banner state ──────────────────────────────────────────────────
  const daysRemaining = tenancy
    ? Math.ceil((tenancy.endDate.getTime() - Date.now()) / dayMs)
    : 0;
  const bannerState: LeaseBannerState = !tenancy
    ? 'vacant'
    : daysRemaining <= 0
      ? 'expired'
      : daysRemaining <= 60
        ? 'expiring'
        : 'active';

  // ── Summary numbers ─────────────────────────────────────────────────────
  const monthlyRent = tenancy?.monthlyRent ?? 0;
  const totalExpected = tenancy
    ? monthlyRent * monthsInclusive(tenancy.startDate, tenancy.endDate)
    : 0;
  const directReceived = rentLedger.reduce((s, e) => s + e.amountPaid, 0);
  const totalReceived = directReceived + (detail.subunitCollection ?? 0);
  const rentOverdue = rentLedger
    .filter((e) => e.status === 'OVERDUE')
    .reduce((s, e) => s + (e.amountDue - e.amountPaid), 0);
  const totalOutstanding = rentOverdue + utilityPending;

  // Most recent recorded payment (rent ledger summary line).
  const paidEntries = rentLedger.filter((e) => e.paidDate);
  const lastPayment = paidEntries.length
    ? paidEntries.reduce((a, b) =>
        (a.paidDate as Date) > (b.paidDate as Date) ? a : b,
      )
    : null;

  return (
    <FadeIn className="mx-auto max-w-5xl">
      {/* Back button */}
      <Link
        href={unitsHref}
        className="inline-flex min-h-[36px] items-center text-sm text-[#6A6A8A] transition-colors hover:text-white"
      >
        ← Back to {unit.propertyName}
      </Link>

      {/* Header: unit name + status badge */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-[32px] font-bold leading-tight text-white">
          {unit.name}
        </h1>
        <span
          className={
            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
            subPropertyStatusBadgeClass(unit.status)
          }
        >
          {subPropertyStatusLabel(unit.status)}
        </span>
        {unit.displayId && (
          <span className="font-mono text-sm text-[#4A4A6A]">
            {unit.displayId}
          </span>
        )}
      </div>

      <div className="mt-1">
        <Breadcrumb
          items={[
            { label: 'Portfolios', href: '/dashboard/portfolios' },
            {
              label: unit.portfolioName,
              href: `/dashboard/portfolios?open=${portfolioId}`,
            },
            { label: unit.propertyName, href: unitsHref },
            { label: unit.name },
          ]}
        />
      </div>

      {/* Lease status banner */}
      <div className="mt-5">
        <LeaseBanner
          state={bannerState}
          tenantName={tenancy?.tenant.name ?? null}
          startDate={tenancy ? formatDate(tenancy.startDate) : null}
          endDate={tenancy ? formatDate(tenancy.endDate) : null}
          daysRemaining={daysRemaining}
          assignHref="/dashboard/tenants"
        />
      </div>

      {/* KPI cards */}
      <div className="mt-6">
        <UnitKpis
          monthlyRent={monthlyRent}
          totalExpected={totalExpected}
          totalReceived={totalReceived}
          rentOverdue={rentOverdue}
          utilityPending={utilityPending}
          totalOutstanding={totalOutstanding}
        />
      </div>

      {/* Tenant + Unit info (60/40) */}
      <Reveal className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Tenant info (collapsible) */}
        <CollapsibleCard
          className="lg:col-span-3"
          testId="tenant-info-card"
          label="Toggle tenant info"
          summary={
            tenancy ? (
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#5B4FE8]/20 text-sm font-semibold text-[#8B6FE8]">
                  {initialsFrom(tenancy.tenant.name)}
                </span>
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-base font-bold text-white">
                    {tenancy.tenant.name}
                  </span>
                  {tenancy.tenant.displayId && (
                    <span className="font-mono text-xs text-[#4A4A6A]">
                      {tenancy.tenant.displayId}
                    </span>
                  )}
                  <span className="text-xs text-[#6A6A8A]">
                    · Unit {unit.unitNumber}
                  </span>
                  <span className="text-xs text-[#6A6A8A]">
                    · {formatMoney(tenancy.monthlyRent)}/mo
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <p className={sectionLabel}>Tenant Info</p>
                <p className="mt-1 text-sm text-[#6A6A8A]">
                  No tenant assigned · Unit {unit.unitNumber}
                </p>
              </div>
            )
          }
        >
          {tenancy ? (
            <>
              <p className={sectionLabel}>Primary Contact</p>
              <div className="mt-2 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-white">
                  <MailIcon />
                  <span className="break-all">{tenancy.tenant.email ?? 'No email'}</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <PhoneIcon />
                  <span>{tenancy.tenant.phone}</span>
                </div>
                <dl>
                  <InfoRow
                    label="Bank Name"
                    value={tenancy.tenant.bankName ?? 'Not provided'}
                    muted={!tenancy.tenant.bankName}
                  />
                  <InfoRow
                    label="Account"
                    value={
                      tenancy.tenant.bankAccountNumber
                        ? `****${tenancy.tenant.bankAccountNumber.slice(-4)}`
                        : 'Not provided'
                    }
                    muted={!tenancy.tenant.bankAccountNumber}
                  />
                </dl>
              </div>

              <div className={divider} />
              <p className={sectionLabel}>Secondary Contact</p>
              <dl className="mt-2">
                <InfoRow
                  label="Name"
                  value={tenancy.tenant.emergencyContactName ?? 'Not provided'}
                  muted={!tenancy.tenant.emergencyContactName}
                />
                <InfoRow
                  label="Phone"
                  value={tenancy.tenant.emergencyContactPhone ?? 'Not provided'}
                  muted={!tenancy.tenant.emergencyContactPhone}
                />
              </dl>

              <div className={divider} />
              <UnitNotesSection unitId={unit.id} notes={unit.notes} />

              <div className="mt-5">
                <Link
                  href={`/dashboard/tenants/${tenancy.tenant.id}/edit`}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-[rgba(139,111,232,0.4)] bg-[rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-[#E8E8F2] transition-colors hover:text-white"
                >
                  Edit Tenant
                </Link>
              </div>
            </>
          ) : (
            <UnitNotesSection unitId={unit.id} notes={unit.notes} />
          )}
        </CollapsibleCard>

        {/* Unit info (collapsible) */}
        <CollapsibleCard
          className="lg:col-span-2"
          testId="unit-info-card"
          label="Toggle unit info"
          summary={
            <div>
              <p className={sectionLabel}>Unit Info</p>
              <p className="mt-1 text-sm text-white">
                Unit {unit.unitNumber}
                <span className="text-[#6A6A8A]">
                  {' '}
                  · {formatMoney(tenancy?.monthlyRent ?? unit.rentAmount)}/mo
                </span>
              </p>
            </div>
          }
        >
          <UnitFloorEditor unitId={unit.id} floor={unit.floor} />
          <dl>
            <InfoRow
              label="Area"
              value={
                unit.areaSqft != null
                  ? `${unit.areaSqft.toLocaleString('en-US')} sqft`
                  : '—'
              }
            />
            <InfoRow label="Type" value={propertyTypeLabel(unit.propertyType)} />
          </dl>

          <div className={divider} />
          <div className="flex items-center justify-between gap-2">
            <p className={sectionLabel}>Lease Details</p>
            {tenancy?.displayId && (
              <span className="font-mono text-xs text-[#4A4A6A]">
                {tenancy.displayId}
              </span>
            )}
          </div>
          {tenancy ? (
            <>
              <dl className="mt-2">
                <InfoRow label="Start Date" value={formatDate(tenancy.startDate)} />
                <InfoRow label="End Date" value={formatDate(tenancy.endDate)} />
                <InfoRow label="Monthly Rent" value={formatMoney(tenancy.monthlyRent)} />
                <InfoRow
                  label="Security Deposit"
                  value={formatMoney(tenancy.securityDeposit)}
                />
                <InfoRow
                  label="Payment Day"
                  value={`${ordinal(tenancy.paymentDayOfMonth)} of each month`}
                />
              </dl>
              <div className="mt-5">
                <TerminateLeaseButton tenancyId={tenancy.id} />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-[#6A6A8A]">No active lease.</p>
          )}
        </CollapsibleCard>
      </Reveal>

      {/* Rent ledger */}
      <Reveal className={glassCard + ' mt-6 p-6'}>
        {tenancy && (
          <div className="mb-3 flex justify-end">
            <RentStatementButton tenancyId={tenancy.id} />
          </div>
        )}
        {tenancy ? (
          <LedgerEntryTable
            tenancyId={tenancy.id}
            title="Rent Ledger"
            canEdit={canEditRent}
          />
        ) : (
          <p className="mt-3 text-sm text-[#6A6A8A]">No active lease.</p>
        )}
      </Reveal>

      {/* Utility accounts */}
      <Reveal className={glassCard + ' mt-6 p-6'}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className={sectionLabel}>Utility Accounts</p>
          <Link
            href={`/dashboard/utilities/accounts/new?subPropertyId=${unit.id}&propertyId=${unit.propertyId}`}
            className={addBtn}
          >
            Add Utility
          </Link>
        </div>
        <UnitUtilityAccounts
          accounts={utilityAccounts.map((a) => ({
            id: a.id,
            type: a.type,
            provider: a.provider,
            accountNumber: a.accountNumber,
            latestBill: a.latestBill
              ? {
                  amount: a.latestBill.amount,
                  dueDate: a.latestBill.dueDate.toISOString(),
                  status: a.latestBill.status,
                }
              : null,
          }))}
        />
      </Reveal>

      {/* Expenses */}
      <Reveal className={glassCard + ' mt-6 p-6'}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className={sectionLabel}>Expenses</p>
          <Link href={`/dashboard/expenses/new?subPropertyId=${unit.id}`} className={addBtn}>
            Add Expense
          </Link>
        </div>
        {expenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[rgba(91,79,232,0.15)] px-3 py-8 text-center">
            <div className="text-2xl">🧾</div>
            <p className="mt-2 text-sm text-[#6A6A8A]">
              No expenses recorded for this unit
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[rgba(91,79,232,0.15)]">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-[rgba(91,79,232,0.1)] text-xs uppercase tracking-wide text-[#8B6FE8]">
                  <tr>
                    <th className="sticky left-0 bg-[#100d24] px-3 py-2 font-medium">
                      Date
                    </th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(91,79,232,0.1)]">
                  {expenses.map((e) => (
                    <tr
                      key={e.id}
                      className="transition-colors hover:bg-[rgba(91,79,232,0.05)]"
                    >
                      <td className="sticky left-0 bg-[#0c0a1e] px-3 py-2 text-[#6A6A8A]">
                        {formatDate(e.date)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                            expenseCategoryBadgeClass(e.category)
                          }
                        >
                          {expenseCategoryLabel(e.category)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[#6A6A8A]">
                        {e.description || '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-white">
                        {formatMoney(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {expenses.length >= 10 && (
              <div className="mt-3 text-right">
                <Link
                  href="/dashboard/expenses"
                  className="text-sm text-[#8B6FE8] transition-colors hover:text-white"
                >
                  View all expenses →
                </Link>
              </div>
            )}
          </>
        )}
      </Reveal>

      {/* Documents */}
      <Reveal className={glassCard + ' mt-6 p-6'}>
        <UnitDocuments
          documents={documents}
          unitId={unit.id}
          unitLabel={unitLabel}
        />
      </Reveal>
    </FadeIn>
  );
}
