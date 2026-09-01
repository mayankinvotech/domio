/**
 * lib/twilio.ts
 *
 * Production-ready wrapper around the official Twilio REST API for:
 *   - Sending SMS verification OTPs
 *   - Sending WhatsApp verification OTPs & notifications
 *   - Standard E.164 phone formatting and validation
 *
 * Environment variables:
 *   TWILIO_ACCOUNT_SID  — Your Twilio Account SID
 *   TWILIO_AUTH_TOKEN   — Your Twilio Auth Token
 *   TWILIO_FROM_NUMBER  — Your Twilio phone number (E.164 format e.g. +1234567890)
 *   TWILIO_WHATSAPP_FROM — Optional Twilio WhatsApp sender (e.g. whatsapp:+14155238886)
 */

import twilio from 'twilio';

export type TwilioSendResult =
  | { sent: true; sid: string; channel: 'SMS' | 'WHATSAPP' | 'BOTH'; error?: never }
  | { sent: false; reason: string; previewOtp?: string };

/**
 * Format any input phone string into clean E.164 international format.
 * Defaults to country code +91 (India) or +1 (US) if not prefixed with '+'.
 */
export function formatE164Phone(rawPhone: string, defaultCountryCode = '+91'): string {
  const trimmed = rawPhone.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.replace(/\D/g, '');
  }
  const cleanDigits = trimmed.replace(/\D/g, '');
  // If 10 digits without country code, prefix defaultCountryCode
  if (cleanDigits.length === 10) {
    return `${defaultCountryCode}${cleanDigits}`;
  }
  return `+${cleanDigits}`;
}

/**
 * Validate that a phone number has sufficient digits to be a real phone.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Send standard 6-digit OTP code to user's phone via Twilio SMS & WhatsApp.
 */
export async function sendOtpSms(
  toPhone: string,
  otp: string,
  appName = 'Domio',
): Promise<TwilioSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM;

  const formattedTo = formatE164Phone(toPhone);

  if (!formattedTo) {
    return { sent: false, reason: 'Invalid phone number provided.' };
  }

  // If Twilio is not configured, log for local dev / relay mode
  if (!accountSid || !authToken || !fromNumber) {
    console.info(
      `[Twilio Dev Mode] OTP for ${formattedTo}: ${otp} (Twilio credentials not set in .env)`,
    );
    return {
      sent: false,
      reason: 'Twilio SMS not configured in .env. Use in-app OTP preview code.',
      previewOtp: otp,
    };
  }

  try {
    const mainAccountSid =
      process.env.TWILIO_MAIN_ACCOUNT_SID ||
      (accountSid.startsWith('AC') ? accountSid : undefined);

    const client = accountSid.startsWith('SK') && mainAccountSid
      ? twilio(accountSid, authToken, { accountSid: mainAccountSid })
      : twilio(accountSid, authToken);

    const smsBody = `Your ${appName} verification code is: ${otp}\n\nValid for 10 minutes. Do not share this OTP with anyone.`;

    const smsMessage = await client.messages.create({
      body: smsBody,
      from: fromNumber,
      to: formattedTo,
    });

    // Also attempt WhatsApp delivery if WhatsApp sender is configured
    if (fromWhatsApp) {
      const waFrom = fromWhatsApp.startsWith('whatsapp:') ? fromWhatsApp : `whatsapp:${fromWhatsApp}`;
      const waBody = `🔒 *${appName} Verification*\n\nYour OTP is: *${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
      try {
        await client.messages.create({
          body: waBody,
          from: waFrom,
          to: `whatsapp:${formattedTo}`,
        });
      } catch (waErr: any) {
        console.warn('[Twilio WhatsApp] Optional WhatsApp dispatch skipped:', waErr?.message);
      }
    }

    return { sent: true, sid: smsMessage.sid, channel: fromWhatsApp ? 'BOTH' : 'SMS' };
  } catch (err: any) {
    console.error('[Twilio] Failed to dispatch SMS:', err?.message || err);
    return {
      sent: false,
      reason: err?.message || 'Failed to send SMS via Twilio',
      previewOtp: otp,
    };
  }
}

