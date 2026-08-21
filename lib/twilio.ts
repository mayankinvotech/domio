/**
 * lib/twilio.ts
 *
 * Thin wrapper around the Twilio REST API for sending SMS OTPs.
 * Requires the following environment variables:
 *   TWILIO_ACCOUNT_SID  — your Twilio Account SID
 *   TWILIO_AUTH_TOKEN   — your Twilio Auth Token
 *   TWILIO_FROM_NUMBER  — the Twilio phone number to send from (E.164 format, e.g. +1XXXXXXXXXX)
 *
 * If any of those variables are missing the function logs a warning and
 * returns { sent: false } — callers then surface the OTP in-app for relay.
 */

import twilio from 'twilio';

export type SmsSendResult =
  | { sent: true; sid: string }
  | { sent: false; reason: string };

export async function sendOtpSms(
  toPhone: string,
  otp: string,
): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn(
      '[Twilio] SMS credentials not configured. OTP will not be sent via SMS.',
    );
    return { sent: false, reason: 'SMS provider not configured' };
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body: `Your Domio rental portal OTP is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      from: fromNumber,
      to: toPhone,
    });
    return { sent: true, sid: message.sid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown SMS error';
    console.error('[Twilio] Failed to send SMS:', message);
    return { sent: false, reason: message };
  }
}
