import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendOtpToPhone } from '@/lib/phone-messaging';
import { isValidPhone, formatE164Phone } from '@/lib/twilio';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { phone, appName = 'Domio' } = body;

    if (!phone || typeof phone !== 'string' || !isValidPhone(phone)) {
      return NextResponse.json(
        { error: 'A valid phone number is required (minimum 8 digits).' },
        { status: 400 },
      );
    }

    const formattedPhone = formatE164Phone(phone);
    const rawOtp = String(randomInt(100000, 999999));
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Invalidate existing unused OTPs for this phone
    await prisma.userOtp.updateMany({
      where: { target: formattedPhone, used: false },
      data: { used: true },
    }).catch(() => {});

    // Try finding linked user if any
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: formattedPhone },
          { phone: phone.trim() },
        ],
      },
      select: { id: true },
    });

    if (user) {
      await prisma.userOtp.create({
        data: {
          userId: user.id,
          type: 'PHONE_VERIFICATION',
          target: formattedPhone,
          otpHash,
          expiresAt,
        },
      }).catch(() => {});
    }

    // Dispatch OTP via Twilio SMS & WhatsApp
    const result = await sendOtpToPhone(formattedPhone, rawOtp, appName);

    return NextResponse.json({
      success: true,
      message: result.smsSent
        ? `Verification OTP sent to ${formattedPhone} via Twilio SMS.`
        : `Verification OTP generated for ${formattedPhone}.`,
      smsSent: result.smsSent,
      whatsappSent: result.whatsappSent,
      whatsappUrl: result.whatsappUrl,
      previewOtp: result.previewOtp || rawOtp,
    });
  } catch (error: any) {
    console.error('[POST /api/auth/otp/send] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch verification OTP.' },
      { status: 500 },
    );
  }
}
