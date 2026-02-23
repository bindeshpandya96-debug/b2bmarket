/**
 * GET /api/addresses — List current user's addresses.
 * POST /api/addresses — Add new address (auth required).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-server';
import { z } from 'zod';

const createAddressSchema = z.object({
  label: z.string().max(100).optional(),
  addressLine1: z.string().min(1).max(500),
  addressLine2: z.string().max(500).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  isDefault: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const list = await prisma.address.findMany({
    where: { userId: auth.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const { isDefault, ...data } = parsed.data;
  if (isDefault) {
    await prisma.address.updateMany({ where: { userId: auth.user.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.create({
    data: {
      userId: auth.user.id,
      ...data,
      isDefault: isDefault ?? false,
    },
  });
  return NextResponse.json(address, { status: 201 });
}
