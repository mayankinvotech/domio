import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/prisma';
import DomioHeader from './_components/domio-header';
import DomioChatWidget from './_components/domio-chat-widget';
import { ThemeProvider, type Theme } from '@/lib/theme-context';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      accountId: true,
      themePreference: true,
      name: true,
      role: true,
      _count: {
        select: {
          portfolios: true,
        },
      },
    },
  });
  const initialTheme: Theme = me?.themePreference === 'dark' ? 'dark' : 'light';

  async function signOutAction() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <div className="theme-root min-h-screen flex flex-col bg-white text-zinc-900">
        {/* Top Header */}
        <DomioHeader
          role={session.user.role}
          email={session.user.email ?? ''}
          name={me?.name ?? session.user.name ?? ''}
          signOutAction={signOutAction}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>

        {/* Floating "Chat with Domi AI Assistant" Widget */}
        <DomioChatWidget />
      </div>
    </ThemeProvider>
  );
}
