/**
 * GET /api/listings/marketplace — Single-call marketplace data for faster load.
 * Returns listings (paginated) + categories + organizations + price range in one response.
 * Reduces 3 round-trips to 1. Cacheable for scalability.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listingService } from '@/server/services/listing.service';
import { searchListingsQuerySchema } from '@/validations/listings';

const CACHE_MAX_AGE = 30; // seconds
const STALE_WHILE_REVALIDATE = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = searchListingsQuerySchema.safeParse({
    category: searchParams.get('category') ?? undefined,
    priceMin: searchParams.get('priceMin') ?? undefined,
    priceMax: searchParams.get('priceMax') ?? undefined,
    hospitalId: searchParams.get('hospitalId') ?? undefined,
    excludeHospitalId: searchParams.get('excludeHospitalId') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    expiryAfter: searchParams.get('expiryAfter') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }
  const { expiryAfter, page = 1, pageSize = 12, ...rest } = parsed.data;
  const expiry = expiryAfter ? new Date(expiryAfter) : new Date();

  const where: Record<string, unknown> = {
    status: 'ACTIVE',
    OR: [{ expiryDate: null }, { expiryDate: { gte: expiry } }],
  };
  if (rest.category) where.category = rest.category;
  if (rest.excludeHospitalId) where.hospitalId = { not: rest.excludeHospitalId };
  else if (rest.hospitalId) where.hospitalId = rest.hospitalId;
  if (rest.priceMin != null || rest.priceMax != null) {
    where.pricePerUnit = {
      ...(rest.priceMin != null && { gte: rest.priceMin }),
      ...(rest.priceMax != null && { lte: rest.priceMax }),
    };
  }

  const [listingsResult, categories, orgRows, priceRange] = await Promise.all([
    listingService.searchListings({
      ...rest,
      page,
      pageSize,
      expiryAfter: expiry,
    }),
    prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.listing.findMany({
      where,
      select: { hospitalId: true, hospital: { select: { id: true, name: true } } },
    }),
    prisma.listing.aggregate({ where, _min: { pricePerUnit: true }, _max: { pricePerUnit: true } }),
  ]);

  const orgMap = new Map<string, { id: string; name: string }>();
  orgRows.forEach((o) => {
    if (o.hospital && !orgMap.has(o.hospitalId)) orgMap.set(o.hospitalId, { id: o.hospital.id, name: o.hospital.name });
  });
  const organizations = Array.from(orgMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  const headers = new Headers();
  headers.set('Cache-Control', `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`);

  return NextResponse.json(
    {
      ...listingsResult,
      categories,
      organizations,
      priceMin: priceRange._min.pricePerUnit != null ? Number(priceRange._min.pricePerUnit) : 0,
      priceMax: priceRange._max.pricePerUnit != null ? Number(priceRange._max.pricePerUnit) : 0,
    },
    { headers }
  );
}
