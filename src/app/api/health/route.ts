import { NextResponse } from 'next/server';

/**
 * Simple health check for load balancers / readiness probes.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
