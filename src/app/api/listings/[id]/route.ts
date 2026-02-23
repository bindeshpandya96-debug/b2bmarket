/**
 * GET /api/listings/[id] — Get single listing. Owner (ADMIN) gets any status; others get marketplace (ACTIVE, not expired).
 * PATCH /api/listings/[id] — Update or deactivate (ADMIN, same hospital only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-server';
import { requireRole } from '@/lib/auth-server';
import { listingService } from '@/server/services/listing.service';
import { updateListingSchema } from '@/validations/listings';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await getSession(request);
  const role = (session?.user as { role?: string })?.role;
  const organizationId = (session?.user as { organizationId?: string })?.organizationId;
  const listing = await listingService.getListingById(id);
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }
  if (role === 'ADMIN' && organizationId && listing.hospitalId === organizationId) {
    return NextResponse.json(listing);
  }
  const marketplaceListing = await listingService.getListingForMarketplace(id);
  if (!marketplaceListing) {
    return NextResponse.json({ error: 'Listing not found or not available' }, { status: 404 });
  }
  return NextResponse.json(marketplaceListing);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireRole(['ADMIN'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = updateListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const listing = await listingService.updateListing(
    id,
    {
      ...parsed.data,
      expiryDate: parsed.data.expiryDate !== undefined
        ? (parsed.data.expiryDate ? new Date(parsed.data.expiryDate as string) : null)
        : undefined,
    },
    auth.user.organizationId
  );
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found or access denied' }, { status: 404 });
  }
  return NextResponse.json(listing);
}
