/**
 * POST /api/invite/send — Send invitation email to the given address (ADMIN only).
 * Body: { email: string }
 * Ensures org has an invite code (generates if missing), then sends a professional
 * invite email with inviter name, organization, invite code, and signup link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-server';
import { sendInviteEmail, isEmailConfigured } from '@/lib/email';
import { z } from 'zod';

const sendSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['ADMIN'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.user.organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: 'Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment.' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { email } = parsed.data;

  const [user, org] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { firstName: true, lastName: true },
    }),
    prisma.organization.findUnique({
      where: { id: auth.user.organizationId },
      select: { name: true, inviteCode: true },
    }),
  ]);
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  let inviteCode = org.inviteCode;
  if (!inviteCode) {
    inviteCode = generateInviteCode();
    await prisma.organization.update({
      where: { id: auth.user.organizationId! },
      data: { inviteCode },
    });
  }

  const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  try {
    await sendInviteEmail({
      to: email,
      inviterFirstName: user?.firstName ?? null,
      inviterLastName: user?.lastName ?? null,
      organizationName: org.name,
      inviteCode,
      siteUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Invitation sent' });
}
