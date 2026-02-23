/**
 * POST /api/orders/[id]/confirm — Seller confirms order (RESERVED → CONFIRMED).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-server';
import { orderService } from '@/server/services/order.service';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireRole(['ADMIN', 'PROCUREMENT'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  const result = await orderService.confirmOrder(id, auth.user.organizationId, auth.user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result.order);
}
