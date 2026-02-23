/**
 * GET /api/user/me — Current user profile. Auth required.
 * PATCH /api/user/me — Update profile (firstName, lastName). Auth required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-server';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  return NextResponse.json({
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: user.organization?.name ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const user = await prisma.user.update({
    where: { id: auth.user.id },
    data: {
      ...(parsed.data.firstName !== undefined && { firstName: parsed.data.firstName }),
      ...(parsed.data.lastName !== undefined && { lastName: parsed.data.lastName }),
    },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });
  return NextResponse.json({
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    role: user.role,
    organizationId: user.organizationId,
    organizationName: user.organization?.name ?? null,
  });
}
