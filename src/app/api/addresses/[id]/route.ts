/**
 * PATCH /api/addresses/[id] — Update address. DELETE /api/addresses/[id] — Delete address.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-server';
import { z } from 'zod';

const updateAddressSchema = z.object({
  label: z.string().max(100).optional(),
  addressLine1: z.string().min(1).max(500).optional(),
  addressLine2: z.string().max(500).optional().nullable(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().max(100).optional().nullable(),
  postalCode: z.string().min(1).max(20).optional(),
  country: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const existing = await prisma.address.findFirst({ where: { id, userId: auth.user.id } });
  if (!existing) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = updateAddressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const { isDefault, ...rest } = parsed.data;
  if (isDefault === true) {
    await prisma.address.updateMany({ where: { userId: auth.user.id }, data: { isDefault: false } });
  }
  const address = await prisma.address.update({
    where: { id },
    data: { ...rest, isDefault: isDefault ?? undefined },
  });
  return NextResponse.json(address);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { id } = await params;
  const existing = await prisma.address.findFirst({ where: { id, userId: auth.user.id } });
  if (!existing) return NextResponse.json({ error: 'Address not found' }, { status: 404 });
  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
