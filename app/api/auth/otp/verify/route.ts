import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { verifyUserOtpCode } from '@/lib/user-verification';
import type { OtpType } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { otp, type = 'EMAIL_VERIFICATION', target } = body;

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit verification code.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, phone: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetToUse =
      target?.trim() ||
      (type === 'EMAIL_VERIFICATION' ? user.email : user.phone);

    if (!targetToUse) {
      return NextResponse.json({ error: 'Target not found' }, { status: 400 });
    }

    const result = await verifyUserOtpCode({
      userId: user.id,
      target: targetToUse,
      rawOtp: otp.trim(),
      type: type as OtpType,
    });

    if (!result.verified) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: error?.message || 'Verification failed' },
      { status: 500 },
    );
  }
}
