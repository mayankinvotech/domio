import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateTenantId } from '@/lib/display-ids';
import { issueTenantJwt, TENANT_JWT_COOKIE } from '@/lib/tenant-otp';

export async function POST(req: Request) {
  try {
    const { username, name, phone, email, password } = await req.json();

    if (!username || !name || !phone || !password) {
      return NextResponse.json(
        { error: 'Username, name, phone, and password are required.' },
        { status: 400 },
      );
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanPhone = phone.trim();
    const cleanEmail = email && typeof email === 'string' && email.includes('@') ? email.trim().toLowerCase() : null;

    // Check if username already taken
    const existing = await prisma.tenant.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Username @${cleanUsername} is already taken. Please choose another.` },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const displayId = await generateTenantId().catch(() => null);

    const tenant = await prisma.tenant.create({
      data: {
        displayId,
        username: cleanUsername,
        name: name.trim(),
        phone: cleanPhone,
        email: cleanEmail,
        password: hashedPassword,
        portalEnabled: true,
        selfRegistered: true,
      },
    });

    const token = await issueTenantJwt({ sub: tenant.id, name: tenant.name, phone: tenant.phone });
    const cookieStore = await cookies();
    cookieStore.set(TENANT_JWT_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return NextResponse.json({ success: true, tenantId: tenant.id }, { status: 201 });
  } catch (error: any) {
    console.error('Tenant self-register error:', error);
    return NextResponse.json(
      { error: error?.message || 'Registration failed' },
      { status: 500 },
    );
  }
}
