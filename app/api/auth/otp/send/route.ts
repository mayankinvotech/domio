import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { requestUserVerificationOtp } from '@/lib/user-verification';
import type { OtpType } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { type = 'EMAIL_VERIFICATION', target } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, phone: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const targetToUse =
      target?.trim() ||
      (type === 'EMAIL_VERIFICATION' ? user.email : user.phone);

    if (!targetToUse) {
      return NextResponse.json(
        {
          error:
            type === 'EMAIL_VERIFICATION'
              ? 'No email address found to verify.'
              : 'No phone number found to verify. Please add a phone number first.',
        },
        { status: 400 },
      );
    }

    const result = await requestUserVerificationOtp({
      userId: user.id,
      type: type as OtpType,
      target: targetToUse,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send verification code' },
      { status: 500 },
    );
  }
}
