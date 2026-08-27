import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TENANT_JWT_COOKIE } from '@/lib/tenant-otp';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(TENANT_JWT_COOKIE);
  return NextResponse.json({ success: true });
}
