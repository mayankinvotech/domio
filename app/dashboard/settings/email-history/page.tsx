import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const dtFmt = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function templateLabel(t: string): string {
  return t
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default async function EmailHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const logs = await prisma.emailLog.findMany({
    where: { ownerId: session.user.id },
    orderBy: { sentAt: 'desc' },
    take: 200,
    select: {
      id: true,
      recipientEmail: true,
      subject: true,
      templateType: true,
      status: true,
      resendId: true,
      sentAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href="/dashboard/settings/notifications"
        className="text-sm text-[#6A6A8A] transition-colors hover:text-white"
      >
        ← Back to Notification Settings
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
        Email History
      </h1>

      {logs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#312D58] bg-[#17152F] p-12 text-center">
          <div className="text-4xl">📭</div>
          <p className="mt-3 text-sm text-[#E8E8F2]">No emails sent yet</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date / Time</th>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Resend ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((l) => (
                <tr
                  key={l.id}
                  className="transition-colors hover:bg-zinc-50"
                >
                  <td className="px-4 py-3 text-[#6A6A8A]">
                    {dtFmt.format(new Date(l.sentAt))}
                  </td>
                  <td className="px-4 py-3 text-[#E8E8F2]">
                    {l.recipientEmail}
                  </td>
                  <td className="px-4 py-3 text-[#6A6A8A]">{l.subject}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full border border-zinc-700/30 bg-zinc-900/15 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                      {templateLabel(l.templateType)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {l.status === 'SENT' ? (
                      <span className="inline-flex rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#4A4A6A]">
                    {l.resendId ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
