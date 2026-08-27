import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyOtp, issueTenantJwt, TENANT_JWT_COOKIE, OtpError } from '@/lib/tenant-otp';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { tenantId, otp } = await req.json();

    if (!tenantId || !otp) {
      return NextResponse.json({ error: 'Tenant ID and OTP are required' }, { status: 400 });
    }

    await verifyOtp(tenantId, String(otp).trim());

    // Fetch tenant details needed for the JWT payload
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, phone: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const token = await issueTenantJwt({ sub: tenant.id, name: tenant.name, phone: tenant.phone });
    const cookieStore = await cookies();
    cookieStore.set(TENANT_JWT_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof OtpError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'OTP verification failed' }, { status: 500 });
  }
}
