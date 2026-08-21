import type { Session } from 'next-auth';
import { auth } from '@/auth';

// Guard for SUPER_ADMIN-only API routes.
// Returns a Response to short-circuit (401/403), or null if allowed.
export async function requireSuperAdmin(): Promise<Response | null> {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'SUPER_ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

// Guard for OWNER-only routes (managing managers, settings, etc.).
export async function requireOwner(): Promise<
  { session: Session } | { response: Response }
> {
  const session = await auth();
  if (!session?.user) {
    return { response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.role !== 'OWNER') {
    return { response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

// Guard for portfolio routes: OWNER or MANAGER only (SUPER_ADMIN is blocked).
// Returns the session (caller needs session.user.id) or a deny Response.
export async function requirePortfolioAccess(): Promise<
  { session: Session } | { response: Response }
> {
  const session = await auth();
  if (!session?.user) {
    return { response: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (session.user.role !== 'OWNER' && session.user.role !== 'MANAGER') {
    return { response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}
