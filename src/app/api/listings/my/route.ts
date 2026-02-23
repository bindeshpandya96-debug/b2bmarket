/**
 * GET /api/listings/my — List current hospital's listings with filters (ADMIN only).
 * Query: title, category, status, page, pageSize
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-server';
import { listingService } from '@/server/services/listing.service';
import { z } from 'zod';

const querySchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['ACTIVE', 'SOLD_OUT', 'EXPIRED', 'INACTIVE']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole(['ADMIN'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.user.organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    title: searchParams.get('title') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }
  const result = await listingService.getMyListings({
    hospitalId: auth.user.organizationId,
    ...parsed.data,
  });
  return NextResponse.json(result);
}
