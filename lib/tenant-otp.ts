/**
 * lib/tenant-otp.ts
 *
 * Business logic for the Tenant Self-Service Portal authentication:
 *   1. generateAndStoreOtp()  – makes a 6-digit OTP, bcrypt-hashes it, stores in DB.
 *   2. verifyOtp()            – checks the hash, marks it used, throws on failure.
 *   3. issueTenantJwt()       – signs a 24-hour JWT identifying the tenant.
 *   4. verifyTenantJwt()      – verifies + decodes the JWT from the cookie.
 *
 * The JWT is stored in an HttpOnly cookie named 'tenant-jwt' and is
 * completely separate from the owner's NextAuth session.
 */

import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';

// ── Constants ─────────────────────────────────────────────────────────────────

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const JWT_TTL = '24h';
const COOKIE_NAME = 'tenant-jwt';

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET is not set');
  // Use a tenant-scoped derivation so the secret space is different from owner JWTs
  return new TextEncoder().encode('tenant:' + secret);
}

// ── OTP generation ────────────────────────────────────────────────────────────

/**
 * Generates a 6-digit OTP, stores a bcrypt hash in TenantOtp, and returns
 * the plaintext code (to be sent via SMS or shown in-app as fallback).
 *
 * Invalidates any existing unused OTPs for this tenant first.
 */
export async function generateAndStoreOtp(tenantId: string): Promise<string> {
  // Expire old OTPs for this tenant (mark them used so they can't be replayed)
  await prisma.tenantOtp.updateMany({
    where: { tenantId, used: false },
    data: { used: true },
  });

  const otp = String(randomInt(100000, 999999)); // always 6 digits
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.tenantOtp.create({
    data: { tenantId, otpHash, expiresAt },
  });

  return otp;
}

// ── OTP verification ──────────────────────────────────────────────────────────

export class OtpError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'EXPIRED'
      | 'ALREADY_USED'
      | 'INVALID',
  ) {
    super(message);
    this.name = 'OtpError';
  }
}

/**
 * Verifies the OTP for a tenant. Throws OtpError on any failure.
 * On success, marks the OTP row as used so it cannot be replayed.
 */
export async function verifyOtp(tenantId: string, rawOtp: string): Promise<void> {
  // Find the most recent unused OTP for this tenant
  const record = await prisma.tenantOtp.findFirst({
    where: { tenantId, used: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new OtpError('No active OTP found. Please request a new one.', 'NOT_FOUND');
  }
  if (record.expiresAt < new Date()) {
    throw new OtpError('This OTP has expired. Please request a new one.', 'EXPIRED');
  }

  const valid = await bcrypt.compare(rawOtp, record.otpHash);
  if (!valid) {
    throw new OtpError('Incorrect OTP. Please try again.', 'INVALID');
  }

  // Mark used atomically — if already used (race), still reject
  const updated = await prisma.tenantOtp.updateMany({
    where: { id: record.id, used: false },
    data: { used: true },
  });
  if (updated.count === 0) {
    throw new OtpError('This OTP was already used.', 'ALREADY_USED');
  }
}

// ── JWT issue & verify ────────────────────────────────────────────────────────

export type TenantJwtPayload = {
  sub: string; // tenantId
  name: string;
  phone: string;
};

/** Signs a 24-hour JWT for the verified tenant. */
export async function issueTenantJwt(payload: TenantJwtPayload): Promise<string> {
  return new SignJWT({ name: payload.name, phone: payload.phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(JWT_TTL)
    .sign(getJwtSecret());
}

/** Verifies the tenant JWT from the cookie. Returns the payload or null. */
export async function verifyTenantJwt(
  token: string,
): Promise<TenantJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.sub !== 'string') return null;
    return {
      sub: payload.sub,
      name: (payload.name as string) ?? '',
      phone: (payload.phone as string) ?? '',
    };
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

export { COOKIE_NAME as TENANT_JWT_COOKIE };

/** Returns a Set-Cookie header value that sets the tenant JWT as HttpOnly. */
export function buildTenantJwtCookie(token: string, maxAgeSeconds = 86400): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

/** Returns a Set-Cookie header value that clears the tenant JWT cookie. */
export function clearTenantJwtCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
