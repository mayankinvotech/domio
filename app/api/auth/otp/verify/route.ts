import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { formatE164Phone } from '@/lib/twilio';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, otp } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit OTP code.' }, { status: 400 });
    }

    const formattedPhone = formatE164Phone(phone);
    const cleanOtp = otp.trim();

    // Look for active OTP record
    const record = await prisma.userOtp.findFirst({
      where: {
        target: formattedPhone,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'No active OTP found for this phone number. Please request a new code.' },
        { status: 404 },
      );
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This OTP has expired. Please request a new code.' },
        { status: 400 },
      );
    }

    const isValid = await bcrypt.compare(cleanOtp, record.otpHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect OTP code. Please try again.' },
        { status: 400 },
      );
    }

    // Mark as used
    await prisma.userOtp.update({
      where: { id: record.id },
      data: { used: true },
    });

    // Mark user phone as verified if linked
    if (record.userId) {
      await prisma.user.update({
        where: { id: record.userId },
        data: { phoneVerified: true },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Phone number verified successfully!',
    });
  } catch (error: any) {
    console.error('[POST /api/auth/otp/verify] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to verify OTP code.' },
      { status: 500 },
    );
  }
}
