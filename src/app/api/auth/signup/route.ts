/**
 * POST /api/auth/signup
 * - Create new organization (hospital) and first user → ADMIN.
 *   Body: { email, password, organizationName }
 * - Join existing organization with invite code → PROCUREMENT.
 *   Body: { email, password, inviteCode }
 */

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase(); // 8 chars
}

const signupNewOrgSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  organizationName: z.string().min(1).max(200),
  inviteCode: z.undefined(),
});

const signupJoinOrgSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
  inviteCode: z.string().min(1, 'Invite code is required'),
  organizationName: z.undefined(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const hasInviteCode = typeof (body as { inviteCode?: string }).inviteCode === 'string' && (body as { inviteCode: string }).inviteCode.trim() !== '';
  const hasOrgName = typeof (body as { organizationName?: string }).organizationName === 'string' && (body as { organizationName: string }).organizationName.trim() !== '';

  if (hasInviteCode && !hasOrgName) {
    // Join existing organization → PROCUREMENT
    const parsed = signupJoinOrgSchema.safeParse({
      ...body,
      inviteCode: (body as { inviteCode: string }).inviteCode?.trim().toUpperCase(),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const { email, password, inviteCode } = parsed.data;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }
    const org = await prisma.organization.findFirst({ where: { inviteCode } });
    if (!org) {
      return NextResponse.json({ error: 'Invalid or expired invite code' }, { status: 400 });
    }
    if (org.status !== 'APPROVED') {
      return NextResponse.json({ error: 'This hospital is not approved yet. Try again later.' }, { status: 400 });
    }
    const passwordHash = await hash(password, 10);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'PROCUREMENT',
        organizationId: org.id,
      },
    });
    return NextResponse.json({
      success: true,
      message: 'Account created. Please sign in.',
      role: 'PROCUREMENT',
    }, { status: 201 });
  }

  // Create new organization → ADMIN
  const parsed = signupNewOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, organizationName } = parsed.data;
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
  }
  const passwordHash = await hash(password, 10);
  const inviteCode = generateInviteCode();
  const org = await prisma.organization.create({
    data: { name: organizationName.trim(), inviteCode, status: 'PENDING' },
  });
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
      organizationId: org.id,
    },
  });
  return NextResponse.json({
    success: true,
    message: 'Your hospital is pending approval. You will be able to sign in once a platform admin approves it.',
    role: 'ADMIN',
    inviteCode,
    pendingApproval: true,
  }, { status: 201 });
}
