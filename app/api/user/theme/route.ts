import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ theme: 'dark' });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { themePreference: true },
    });

    return NextResponse.json({ theme: user?.themePreference || 'dark' });
  } catch {
    return NextResponse.json({ theme: 'dark' });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { theme } = body;

    if (theme === 'light' || theme === 'dark') {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { themePreference: theme },
      });
      return NextResponse.json({ success: true, theme });
    }

    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}
