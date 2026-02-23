/**
 * GET /api/orders/[id] — Get order (buyer or seller of that order).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { orderRepository } from '@/server/repositories/order.repository';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { id } = await params;
  const order = await orderRepository.findById(id);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  const orgId = auth.user.organizationId;
  if (order.buyerHospitalId !== orgId && order.sellerHospitalId !== orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(order);
}
