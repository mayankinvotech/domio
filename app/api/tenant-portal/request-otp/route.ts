import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAndStoreOtp } from '@/lib/tenant-otp';
import { sendOtpToPhone } from '@/lib/phone-messaging';
import { generateTenantId } from '@/lib/display-ids';

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const raw = phone.trim();
    const digitsOnly = raw.replace(/\D/g, '');
    const last10 = digitsOnly.slice(-10);

    // 1. Search for existing Tenant by phone variations
    let tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { phone: raw },
          { phone: digitsOnly },
          { phone: `+${digitsOnly}` },
          ...(last10.length >= 7 ? [{ phone: { contains: last10 } }] : []),
        ],
      },
    });

    // 2. If not found in Tenant, check if user exists in User table
    if (!tenant) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: raw },
            { phone: digitsOnly },
            { phone: `+${digitsOnly}` },
            ...(last10.length >= 7 ? [{ phone: { contains: last10 } }] : []),
          ],
        },
      });

      if (user) {
        // Link or create corresponding Tenant record
        const displayId = await generateTenantId().catch(() => null);
        tenant = await prisma.tenant.create({
          data: {
            displayId,
            userId: user.id,
            name: user.name,
            phone: user.phone || raw,
            email: user.email,
            username: user.email?.split('@')[0] || `tenant_${last10.slice(-4)}`,
            portalEnabled: true,
            selfRegistered: true,
          },
        });
      }
    }

    // 3. If still no tenant exists, auto-provision a self-registered tenant
    if (!tenant) {
      const displayId = await generateTenantId().catch(() => null);
      const suffix = last10.length >= 4 ? last10.slice(-4) : Math.floor(1000 + Math.random() * 9000);
      tenant = await prisma.tenant.create({
        data: {
          displayId,
          name: `Tenant (${raw})`,
          phone: raw,
          username: `tenant_${suffix}`,
          portalEnabled: true,
          selfRegistered: true,
        },
      });
    }

    // 4. Generate 6-digit OTP
    const otp = await generateAndStoreOtp(tenant.id);

    // 5. Dispatch via SMS and/or WhatsApp
    const dispatchResult = await sendOtpToPhone(raw, otp);

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      phone: raw,
      smsSent: dispatchResult.smsSent,
      whatsappSent: dispatchResult.whatsappSent,
      whatsappUrl: dispatchResult.whatsappUrl,
      devOtp: otp, // Kept for seamless dev testing
    });
  } catch (error: any) {
    console.error('Request OTP error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate OTP' },
      { status: 500 },
    );
  }
}
