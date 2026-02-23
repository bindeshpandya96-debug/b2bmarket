/**
 * PATCH /api/admin/organizations/[id]/approve — Approve organization (SUPER_ADMIN only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['SUPER_ADMIN'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id } });
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  if (org.status === 'APPROVED') {
    return NextResponse.json({ message: 'Already approved', organization: org }, { status: 200 });
  }
  const updated = await prisma.organization.update({
    where: { id },
    data: { status: 'APPROVED' },
  });
  return NextResponse.json(updated);
}
