import { formatE164Phone, sendOtpSms } from '@/lib/twilio';

export type MessageDispatchResult = {
  smsSent: boolean;
  whatsappSent: boolean;
  whatsappUrl: string;
  previewOtp?: string;
  reason?: string;
};

/**
 * Dispatches an OTP verification code via Twilio SMS & WhatsApp.
 * Also generates a 1-click wa.me URL for instant WhatsApp relay.
 */
export async function sendOtpToPhone(
  toPhone: string,
  otp: string,
  appName = 'Domio',
): Promise<MessageDispatchResult> {
  const e164Phone = formatE164Phone(toPhone);
  const cleanDigits = e164Phone.replace(/\D/g, '');

  const messageBody = `🔒 Your ${appName} verification code is: *${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
  const whatsappUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(messageBody)}`;

  const twilioResult = await sendOtpSms(toPhone, otp, appName);

  return {
    smsSent: twilioResult.sent,
    whatsappSent: twilioResult.sent && (twilioResult.channel === 'WHATSAPP' || twilioResult.channel === 'BOTH'),
    whatsappUrl,
    previewOtp: !twilioResult.sent ? twilioResult.previewOtp : undefined,
    reason: !twilioResult.sent ? twilioResult.reason : undefined,
  };
}

