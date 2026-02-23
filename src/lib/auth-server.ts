/**
 * Server-side auth: get session and require auth/role for API routes.
 * In App Router, getServerSession(authOptions) uses the current request context for cookies.
 */

import { getServerSession } from 'next-auth';
import type { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';

export type CurrentUser = {
  id: string;
  organizationId: string | null; // null for SUPER_ADMIN
  role: UserRole;
  email?: string | null;
};

/**
 * Get session. In App Router, use getServerSession(authOptions) only — it reads
 * cookies from the current request context (Route Handler / Server Component).
 */
export async function getSession(_request?: Request) {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}

/** Get current user from session. Null if not logged in. */
export async function getCurrentUser(request?: Request): Promise<CurrentUser | null> {
  const session = await getSession(request);
  if (!session?.user?.id || !session.user.role) return null;
  const role = session.user.role as UserRole;
  const organizationId = session.user.organizationId ?? null;
  if (role !== 'SUPER_ADMIN' && !organizationId) return null;
  return {
    id: session.user.id,
    organizationId,
    role,
    email: session.user.email ?? null,
  };
}

/** Require auth. Pass request in API Route Handlers so session cookie is read. */
export async function requireAuth(request?: Request): Promise<
  { user: CurrentUser } | { error: string; status: 401 }
> {
  const user = await getCurrentUser(request);
  if (!user) return { error: 'Unauthorized. Please sign in.', status: 401 };
  return { user };
}

/** Require auth and role. Pass request in API Route Handlers. */
export async function requireRole(allowed: UserRole[], request?: Request): Promise<
  { user: CurrentUser } | { error: string; status: 401 | 403 }
> {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth;
  if (!allowed.includes(auth.user.role)) {
    return { error: `Forbidden: requires one of ${allowed.join(', ')}`, status: 403 };
  }
  return { user: auth.user };
}
