import twilio from 'twilio';

export type MessageDispatchResult = {
  smsSent: boolean;
  whatsappSent: boolean;
  whatsappUrl: string;
  reason?: string;
};

/**
 * Dispatches an OTP verification code via SMS (Twilio) and/or WhatsApp (Twilio WhatsApp + direct wa.me URL).
 */
export async function sendOtpToPhone(
  toPhone: string,
  otp: string,
): Promise<MessageDispatchResult> {
  const cleanDigits = toPhone.replace(/\D/g, '');
  const e164Phone = toPhone.startsWith('+') ? toPhone : `+${cleanDigits}`;

  const messageBody = `🔒 Your Domio Tenant Portal verification OTP is: *${otp}*\n\nThis code expires in 10 minutes. Do not share this code with anyone.`;
  const whatsappUrl = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(messageBody)}`;

  let smsSent = false;
  let whatsappSent = false;
  let errorReason: string | undefined;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM || (fromNumber ? `whatsapp:${fromNumber}` : undefined);

  if (accountSid && authToken && fromNumber) {
    try {
      const client = twilio(accountSid, authToken);

      // 1. Try SMS
      try {
        await client.messages.create({
          body: `Your Domio rental portal OTP is: ${otp}. Valid for 10 minutes.`,
          from: fromNumber,
          to: e164Phone,
        });
        smsSent = true;
      } catch (smsErr: any) {
        console.warn('[PhoneMessaging] SMS dispatch failed:', smsErr?.message);
        errorReason = smsErr?.message;
      }

      // 2. Try Twilio WhatsApp if configured
      if (fromWhatsApp) {
        try {
          await client.messages.create({
            body: messageBody,
            from: fromWhatsApp.startsWith('whatsapp:') ? fromWhatsApp : `whatsapp:${fromWhatsApp}`,
            to: `whatsapp:${e164Phone}`,
          });
          whatsappSent = true;
        } catch (waErr: any) {
          console.warn('[PhoneMessaging] Twilio WhatsApp dispatch failed:', waErr?.message);
        }
      }
    } catch (err: any) {
      console.error('[PhoneMessaging] Twilio client error:', err?.message);
      errorReason = err?.message;
    }
  }

  return {
    smsSent,
    whatsappSent,
    whatsappUrl,
    reason: errorReason,
  };
}
