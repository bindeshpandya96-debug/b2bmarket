/**
 * GET /api/admin/listings — List all listings across organizations (SUPER_ADMIN only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const auth = await requireRole(['SUPER_ADMIN'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { hospital: { select: { id: true, name: true, status: true } } },
    }),
    prisma.listing.count(),
  ]);

  const list = items.map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    description: l.description,
    quantityAvailable: l.quantityAvailable,
    pricePerUnit: String(l.pricePerUnit),
    expiryDate: l.expiryDate?.toISOString().slice(0, 10) ?? null,
    status: l.status,
    createdAt: l.createdAt,
    hospitalId: l.hospitalId,
    hospitalName: l.hospital.name,
    hospitalStatus: l.hospital.status,
  }));

  return NextResponse.json({ items: list, total, page, pageSize });
}
