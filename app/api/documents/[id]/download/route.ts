import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { resolveDataScope } from '@/lib/manager-access';
import { getSignedDownloadUrl } from '@/lib/r2';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const ds = await resolveDataScope(session.user);

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, ownerId: true, fileKey: true },
  });
  if (!doc || doc.ownerId !== ds.ownerId) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  try {
    const url = await getSignedDownloadUrl(doc.fileKey);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Failed to sign download URL:', err);
    return NextResponse.json(
      { error: 'Failed to generate a download link. Please try again.' },
      { status: 500 },
    );
  }
}
