/**
 * POST /api/cron/expire-orders — Expire RESERVED orders past timeout (restore stock).
 * Call from a cron job or scheduler (e.g. every 5–15 min).
 * If CRON_SECRET is set in .env, request must include header: CRON_SECRET: <value>
 */

import { NextRequest, NextResponse } from 'next/server';
import { orderService } from '@/server/services/order.service';

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const headerSecret = request.headers.get('CRON_SECRET') ?? request.headers.get('x-cron-secret');
    if (headerSecret !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const result = await orderService.expireReservedOrders(null);
  return NextResponse.json(result);
}
