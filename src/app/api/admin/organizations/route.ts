/**
 * GET /api/admin/organizations — List all organizations (SUPER_ADMIN only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const auth = await requireRole(['SUPER_ADMIN'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { users: true, listings: true } },
    },
  });
  const items = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    status: o.status,
    inviteCode: o.inviteCode,
    createdAt: o.createdAt,
    userCount: o._count.users,
    listingCount: o._count.listings,
  }));
  return NextResponse.json({ items });
}
