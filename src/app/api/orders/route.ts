/**
 * POST /api/orders — Initiate purchase (PROCUREMENT or ADMIN). Creates order in RESERVED state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-server';
import { orderService } from '@/server/services/order.service';
import { createOrderSchema } from '@/validations/orders';

export async function POST(request: NextRequest) {
  const auth = await requireRole(['ADMIN', 'PROCUREMENT'], request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  if (!auth.user.organizationId) {
    return NextResponse.json({ error: 'Organization required' }, { status: 400 });
  }
  const result = await orderService.initiatePurchase(
    {
      listingId: parsed.data.listingId,
      quantity: parsed.data.quantity,
      buyerHospitalId: auth.user.organizationId,
      deliveryAddress: parsed.data.deliveryAddress ?? undefined,
    },
    auth.user.id
  );
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result.order, { status: 201 });
}
