/**
 * GET /api/organization — Current user's organization (name; inviteCode only for ADMIN).
 * PATCH /api/organization — Generate invite code for org (ADMIN only, when missing).
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/auth-server';

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.user.organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: auth.user.organizationId },
    select: { name: true, inviteCode: true },
  });
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  const isAdmin = auth.user.role === 'ADMIN';
  return NextResponse.json({
    name: org.name,
    ...(isAdmin && { inviteCode: org.inviteCode }),
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole(['ADMIN'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.user.organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: auth.user.organizationId },
    select: { inviteCode: true },
  });
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  const newCode = generateInviteCode();
  await prisma.organization.update({
    where: { id: auth.user.organizationId },
    data: { inviteCode: newCode },
  });
  return NextResponse.json({ inviteCode: newCode });
}
