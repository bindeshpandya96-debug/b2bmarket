/**
 * GET /api/listings/facets — Filter options (organizations, price range). Categories from /api/categories.
 * Public; no auth. Lightweight: 2 queries only.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const expiryNow = new Date();
  const where = {
    status: 'ACTIVE' as const,
    OR: [{ expiryDate: null }, { expiryDate: { gte: expiryNow } }],
  };

  const [orgRows, priceRange] = await Promise.all([
    prisma.listing.findMany({ where, select: { hospitalId: true, hospital: { select: { id: true, name: true } } } }),
    prisma.listing.aggregate({ where, _min: { pricePerUnit: true }, _max: { pricePerUnit: true } }),
  ]);

  const orgMap = new Map<string, { id: string; name: string }>();
  orgRows.forEach((o) => {
    if (o.hospital && !orgMap.has(o.hospitalId)) orgMap.set(o.hospitalId, { id: o.hospital.id, name: o.hospital.name });
  });
  const orgList = Array.from(orgMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const headers = new Headers();
  headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  return NextResponse.json(
    {
      organizations: orgList,
      priceMin: priceRange._min.pricePerUnit != null ? Number(priceRange._min.pricePerUnit) : 0,
      priceMax: priceRange._max.pricePerUnit != null ? Number(priceRange._max.pricePerUnit) : 0,
    },
    { headers }
  );
}
