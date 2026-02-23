/**
 * GET /api/listings — Search marketplace (only ACTIVE, not expired). Pagination + filters.
 * POST /api/listings — Create listing (ADMIN only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-server';
import { listingService } from '@/server/services/listing.service';
import { createListingSchema, searchListingsQuerySchema } from '@/validations/listings';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = searchListingsQuerySchema.safeParse({
    category: searchParams.get('category') ?? undefined,
    priceMin: searchParams.get('priceMin') ?? undefined,
    priceMax: searchParams.get('priceMax') ?? undefined,
    hospitalId: searchParams.get('hospitalId') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    expiryAfter: searchParams.get('expiryAfter') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }
  const { expiryAfter, ...rest } = parsed.data;
  const result = await listingService.searchListings({
    ...rest,
    expiryAfter: expiryAfter ? new Date(expiryAfter) : new Date(),
  });
  const headers = new Headers();
  headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  return NextResponse.json(result, { headers });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['ADMIN'], request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const parsed = createListingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const listing = await listingService.createListing({
      hospitalId: auth.user.organizationId,
      ...parsed.data,
      expiryDate: parsed.data.expiryDate ?? null,
    });
    return NextResponse.json(listing, { status: 201 });
  } catch (err) {
    console.error('[POST /api/listings]', err);
    return NextResponse.json(
      { error: 'Failed to create listing', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
