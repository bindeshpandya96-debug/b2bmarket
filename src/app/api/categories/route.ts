/**
 * GET /api/categories — List all categories (for dropdowns and filters). Public.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const list = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  const headers = new Headers();
  headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
  return NextResponse.json(list, { headers });
}
