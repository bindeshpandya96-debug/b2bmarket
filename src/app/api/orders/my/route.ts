/**
 * GET /api/orders/my — List orders for current user's hospital (query: ?as=buyer | as=seller).
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { orderRepository } from '@/server/repositories/order.repository';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const as = request.nextUrl.searchParams.get('as');
  if (as === 'seller') {
    const orders = await orderRepository.findManyBySeller(auth.user.organizationId);
    return NextResponse.json({ orders });
  }
  const orders = await orderRepository.findManyByBuyer(auth.user.organizationId);
  return NextResponse.json({ orders });
}
