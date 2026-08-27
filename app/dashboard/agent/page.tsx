'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type InvitedUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  properties: { id: string; name: string; customType: string | null }[];
  tenancies: { id: string; monthlyRent: number }[];
};

type HiringRequest = {
  id: string;
  clientName: string;
  clientRole: string;
  clientPhone: string;
  clientEmail: string | null;
  location: string;
  propertyType: string | null;
  serviceNeeded: string;
  budgetOrRent: number | null;
  notes: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED';
  createdAt: string;
};

type Deal = {
  id: string;
  title: string;
  propertyType: string;
  dealType: string;
  dealAmount: number;
  commissionAmount: number;
  clientName: string;
  dealDate: string;
};

type AgentData = {
  id: string;
  displayId: string | null;
  agencyName: string | null;
  location: string;
  skills: string[];
  commissionRate: string;
  bio: string | null;
  inviteCode: string;
  rating: number;
  phone: string | null;
  email: string | null;
  totalCommissionEarned: number;
  totalPropertiesManaged: number;
  invitedCount: number;
  pendingHiringCount: number;
  invitedUsers: InvitedUser[];
  hiringRequests: HiringRequest[];
  deals: Deal[];
};

export default function AgentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'invites' | 'hiring' | 'deals'>('invites');

  async function fetchAgentData() {
    try {
      const res = await fetch('/api/agents/me');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (!json.isAgent) {
        router.push('/dashboard/agent/register');
        return;
      }
      setData(json.agent);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAgentData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/register?ref=${data.inviteCode}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join Domio to manage your properties or find rental spaces with verified agents! Register using my official agent invite link: ${inviteUrl}`,
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Invitation to join Domio Property Platform`);
    const body = encodeURIComponent(
      `Hello,\n\nI invite you to join Domio to manage your properties, collect rent, or find verified rentals. Use my agent invite link to get started:\n\n${inviteUrl}\n\nBest regards,\n${data.agencyName || 'Your Domio Agent'}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  async function handleStatusChange(requestId: string, nextStatus: string) {
    try {
      const res = await fetch(`/api/agents/hiring-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchAgentData();
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-full bg-[#fafaf9]">
      {/* ── Signature Architectural Hero for Agent Hub ───────────── */}
      <section className="relative overflow-hidden bg-zinc-950 py-12 sm:py-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.8), rgba(9, 9, 11, 0.98)), url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80')`,
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
                <span>💼</span>
                <span>Agent &amp; Brokerage Hub</span>
                {data.displayId && (
                  <span className="font-mono text-amber-400">· {data.displayId}</span>
                )}
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {data.agencyName || 'Agent Dashboard'}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-300 max-w-2xl font-normal">
                Operational in <span className="font-semibold text-white">📍 {data.location}</span> · Commission structure: <span className="font-semibold text-amber-400">{data.commissionRate}</span>
              </p>

              {/* Skills badges */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {data.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/agents"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition-all hover:bg-zinc-100 hover:scale-105 active:scale-95 shadow-lg"
              >
                <span>🤝</span> Browse Agent Marketplace
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Invited Users
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">
                {data.invitedCount}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Properties In Network
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">
                {data.totalPropertiesManaged}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Commission Earned
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-amber-400">
                ${data.totalCommissionEarned.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/40 p-4 backdrop-blur-md">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Hiring Inquiries
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-zinc-200">
                {data.hiringRequests.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content Area ────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-8">
        {/* Referral Invitation Card */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-white to-zinc-50 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-900">
                <span>✨</span> Personal Agent Invitation Link
              </div>
              <h2 className="mt-3 text-2xl font-black text-zinc-900">
                Invite Property Owners &amp; Renters
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-zinc-600">
                Share your personal invitation link. When an owner or tenant registers using your link, they are attributed to your agent portfolio so you can manage their leases and earn commissions.
              </p>
            </div>

            {/* Link Copy & Share Actions */}
            <div className="flex flex-col gap-3 min-w-[320px]">
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-300 bg-white p-2 shadow-xs">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="w-full bg-transparent px-2 text-xs font-mono text-zinc-800 outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={copyInviteLink}
                  className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
                >
                  {copied ? 'Copied ✓' : 'Copy Link'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={shareWhatsApp}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition-all hover:bg-emerald-100"
                >
                  <span>💬</span> Share WhatsApp
                </button>
                <button
                  type="button"
                  onClick={shareEmail}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-800 transition-all hover:bg-zinc-200"
                >
                  <span>✉️</span> Email Invite
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveTab('invites')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'invites'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            Invited Users ({data.invitedUsers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hiring')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'hiring'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            Hiring Inquiries ({data.hiringRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deals')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'deals'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            Closed Deals ({data.deals.length})
          </button>
        </div>

        {/* Tab 1: Invited Users */}
        {activeTab === 'invites' && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">
              Users Registered via Your Invite Link
            </h3>

            {data.invitedUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
                <p className="text-sm text-zinc-500 font-medium">
                  No users have joined via your link yet.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Share your invite link above with property owners and renters to start tracking referrals.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Properties / Leases</th>
                      <th className="px-4 py-3">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.invitedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-zinc-900">{u.name}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold text-zinc-800">{u.email}</p>
                          {u.phone && <p className="text-zinc-500 font-mono">{u.phone}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-700">
                          {u.properties.length > 0 && (
                            <p className="font-semibold">
                              🏢 {u.properties.length} Properties
                            </p>
                          )}
                          {u.tenancies.length > 0 && (
                            <p className="font-semibold text-emerald-700">
                              🏠 {u.tenancies.length} Active Tenancies
                            </p>
                          )}
                          {u.properties.length === 0 && u.tenancies.length === 0 && (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Hiring Requests */}
        {activeTab === 'hiring' && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">
              Direct Hiring Requests from Owners &amp; Tenants
            </h3>

            {data.hiringRequests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
                <p className="text-sm text-zinc-500 font-medium">
                  No hiring inquiries received yet.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Your profile is listed in the Agent Directory where owners and renters can hire you.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {data.hiringRequests.map((hr) => (
                  <div
                    key={hr.id}
                    className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase">
                          {hr.clientRole}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            hr.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : hr.status === 'COMPLETED'
                                ? 'bg-blue-100 text-blue-800'
                                : hr.status === 'DECLINED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {hr.status}
                        </span>
                      </div>

                      <h4 className="mt-2 text-base font-bold text-zinc-900">
                        {hr.clientName}
                      </h4>
                      <p className="text-xs text-zinc-500 font-mono">
                        📞 {hr.clientPhone} {hr.clientEmail ? `· ✉️ ${hr.clientEmail}` : ''}
                      </p>

                      <div className="mt-3 rounded-xl bg-zinc-50 p-3 text-xs flex flex-col gap-1 text-zinc-700">
                        <p>
                          <span className="font-bold">Service Needed:</span> {hr.serviceNeeded}
                        </p>
                        <p>
                          <span className="font-bold">Location:</span> 📍 {hr.location}
                        </p>
                        {hr.propertyType && (
                          <p>
                            <span className="font-bold">Property Type:</span> 🏷️ {hr.propertyType}
                          </p>
                        )}
                        {hr.budgetOrRent && (
                          <p>
                            <span className="font-bold">Budget / Rent:</span> ${hr.budgetOrRent.toLocaleString()}
                          </p>
                        )}
                        {hr.notes && (
                          <p className="mt-1 text-zinc-500 italic">
                            &quot;{hr.notes}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-3">
                      {hr.status === 'PENDING' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(hr.id, 'ACCEPTED')}
                            className="flex-1 rounded-xl bg-zinc-900 py-1.5 text-xs font-bold text-white hover:bg-zinc-800"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(hr.id, 'DECLINED')}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {hr.status === 'ACCEPTED' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(hr.id, 'COMPLETED')}
                          className="w-full rounded-xl bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                        >
                          Mark Deal Completed ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Closed Deals */}
        {activeTab === 'deals' && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-zinc-900 mb-4">
              Brokered Deals &amp; Commission History
            </h3>

            {data.deals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 p-8 text-center">
                <p className="text-sm text-zinc-500 font-medium">
                  No closed deals recorded yet.
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  When you close deals for your invited clients, your earned commissions will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Deal Title</th>
                      <th className="px-4 py-3">Property Type</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Deal Value</th>
                      <th className="px-4 py-3">Commission</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {data.deals.map((d) => (
                      <tr key={d.id} className="hover:bg-zinc-50/60 transition-colors">
                        <td className="px-4 py-3 font-bold text-zinc-900">{d.title}</td>
                        <td className="px-4 py-3 text-xs">{d.propertyType}</td>
                        <td className="px-4 py-3 text-xs font-medium">{d.clientName}</td>
                        <td className="px-4 py-3 font-mono font-semibold">${d.dealAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                          +${d.commissionAmount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
                          {new Date(d.dealDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
