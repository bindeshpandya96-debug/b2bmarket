/**
 * PATCH /api/admin/categories/[id] — Update category (SUPER_ADMIN).
 * DELETE /api/admin/categories/[id] — Delete category (SUPER_ADMIN).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-server';
import { z } from 'zod';

const updateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['SUPER_ADMIN'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Validation failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const name = parsed.data.name;
  if (name !== existing.name) {
    const duplicate = await prisma.category.findUnique({ where: { name } });
    if (duplicate) {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 400 });
    }
  }
  const category = await prisma.category.update({
    where: { id },
    data: { name },
    select: { id: true, name: true, createdAt: true },
  });
  return NextResponse.json(category);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['SUPER_ADMIN'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }
  const listingsCount = await prisma.listing.count({ where: { category: existing.name } });
  if (listingsCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${listingsCount} listing(s) use this category. Change or remove them first.` },
      { status: 400 }
    );
  }
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
