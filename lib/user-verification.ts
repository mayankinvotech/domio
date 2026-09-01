import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendOtpSms } from '@/lib/twilio';
import type { OtpType } from '@prisma/client';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function requestUserVerificationOtp({
  userId,
  type,
  target,
}: {
  userId: string;
  type: OtpType;
  target: string;
}): Promise<{ success: boolean; message: string; previewCode?: string }> {
  // Expire old unused OTPs for this user & target
  await prisma.userOtp.updateMany({
    where: { userId, target, used: false },
    data: { used: true },
  });

  const rawOtp = String(randomInt(100000, 999999));
  const otpHash = await bcrypt.hash(rawOtp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.userOtp.create({
    data: {
      userId,
      type,
      target,
      otpHash,
      expiresAt,
    },
  });

  if (type === 'EMAIL_VERIFICATION') {
    const emailResult = await sendEmail({
      to: target,
      subject: 'Your Domio Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e1e2e3; border-radius: 12px;">
          <h2 style="color: #18181b; margin-top: 0;">Verify Your Gmail / Email Address</h2>
          <p style="color: #52525b; font-size: 14px;">Use the 6-digit verification code below to confirm your email on Domio:</p>
          <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #09090b; margin: 20px 0;">
            ${rawOtp}
          </div>
          <p style="color: #71717a; font-size: 12px;">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
      text: `Your Domio verification code is: ${rawOtp}. This code expires in 10 minutes.`,
    });

    return {
      success: true,
      message: `Verification code sent to ${target}. Please check your inbox.`,
      previewCode: !emailResult.success ? rawOtp : undefined,
    };
  } else if (type === 'PHONE_VERIFICATION') {
    const smsResult = await sendOtpSms(target, rawOtp, 'Domio');
    return {
      success: true,
      message: smsResult.sent
        ? `Verification code sent to ${target} via Twilio SMS.`
        : `Verification code generated for ${target}.`,
      previewCode: !smsResult.sent ? (smsResult.previewOtp || rawOtp) : undefined,
    };
  }

  return { success: true, message: 'OTP generated', previewCode: rawOtp };
}

export async function verifyUserOtpCode({
  userId,
  target,
  rawOtp,
  type,
}: {
  userId: string;
  target: string;
  rawOtp: string;
  type: OtpType;
}): Promise<{ verified: boolean; message: string }> {
  const record = await prisma.userOtp.findFirst({
    where: { userId, target, type, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return { verified: false, message: 'No active OTP found. Please request a new code.' };
  }

  if (record.expiresAt < new Date()) {
    return { verified: false, message: 'This code has expired. Please request a new one.' };
  }

  const matches = await bcrypt.compare(rawOtp.trim(), record.otpHash);
  if (!matches) {
    return { verified: false, message: 'Incorrect verification code. Please try again.' };
  }

  // Mark as used
  await prisma.userOtp.update({
    where: { id: record.id },
    data: { used: true },
  });

  // Update user verification flag
  if (type === 'EMAIL_VERIFICATION') {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  } else if (type === 'PHONE_VERIFICATION') {
    await prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });
  }

  return { verified: true, message: 'Verification successful!' };
}
