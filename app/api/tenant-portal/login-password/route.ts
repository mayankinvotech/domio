import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { issueTenantJwt, TENANT_JWT_COOKIE } from '@/lib/tenant-otp';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const clean = username.trim().toLowerCase().replace(/^@/, '');

    // Search by username, email, or phone
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { username: clean },
          { email: clean },
          { phone: clean },
        ],
      },
    });

    if (!tenant || !tenant.password) {
      return NextResponse.json(
        { error: 'Invalid credentials or account does not exist.' },
        { status: 401 },
      );
    }

    const valid = await bcrypt.compare(password, tenant.password);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      );
    }

    const token = await issueTenantJwt({ sub: tenant.id, name: tenant.name, phone: tenant.phone });
    const cookieStore = await cookies();
    cookieStore.set(TENANT_JWT_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return NextResponse.json({ success: true, tenantId: tenant.id });
  } catch (error: any) {
    console.error('Password login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Login failed' },
      { status: 500 },
    );
  }
}
