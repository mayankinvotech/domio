import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyTenantJwt, TENANT_JWT_COOKIE } from '@/lib/tenant-otp';
import TenantPortalDashboard from './dashboard';

export default async function TenantPortalPage() {
  // Server-side: verify JWT cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(TENANT_JWT_COOKIE)?.value;
  if (!token) redirect('/tenant-portal/login');

  const payload = await verifyTenantJwt(token);
  if (!payload) redirect('/tenant-portal/login');

  return <TenantPortalDashboard />;
}
